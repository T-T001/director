from __future__ import annotations

import json
import re
from dataclasses import dataclass
from typing import Any

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.ai import ModelClient, ResolvedModel
from app.schemas.novel_promotion import (
    NovelIntakeAnalysis,
    NovelIntakePreviewResponse,
    NovelIntakeSplitEpisode,
)
from app.workers.handlers.base import resolve_model_for_user_and_project

_STOP_WORDS = {
    "他", "她", "它", "你", "我", "们", "的", "了", "和", "是", "在", "有", "就", "不",
    "也", "都", "这", "那", "个", "上", "下", "里", "去", "来", "说", "道", "看", "一",
    "着", "过", "又", "很", "要", "能", "会", "到", "被", "把", "从", "为", "而", "与",
    "之", "于", "所", "以", "但", "却", "只", "之后", "之前", "自己", "什么",
}

_ANALYZE_PREVIEW_SYSTEM = (
    "你是资深短剧改编策划，请阅读用户粘贴的小说或剧情文本，输出严格 JSON，不能输出任何额外解释。"
    "JSON 顶层键固定为 analysis 与 split_episodes。"
    "analysis 必须包含：characters,scenes,dialogue,keywords,emotions,genre,sentimentScore,pace。"
    "characters 是数组，元素包含 name,lineCount,wordCount,sampleQuote,firstAppearanceRatio。"
    "scenes 是数组，元素包含 index,location,positionRatio,preview。"
    "dialogue 包含 totalLines,averageLength,longestLength,ratioOfTotalText。"
    "keywords 是数组，元素包含 word,frequency。"
    "emotions 是数组，元素包含 key,label,count。"
    "pace 只能是 slow/steady/fast。"
    "split_episodes 是数组，元素包含 number,title,summary,content,wordCount。"
    "如果原文明显已有分集/分章结构，就按原结构拆分；否则按剧情节奏给出合理分集。"
    "title 使用“第 X 集”或带副标题；summary 简要概括该集；content 保留该集完整正文；wordCount 填该 content 的字数。"
    "保证 content 片段拼接后覆盖原文主要内容，不要杜撰新剧情。"
)


@dataclass
class IntakePreviewService:
    db: Session

    def validate_content(self, content: str) -> str:
        text = content.strip()
        if len(text) < 80:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail={"message": "正文过短（至少 80 字）。"},
            )
        return text

    def resolve_model(self, *, user_id: str, project_id: str) -> ResolvedModel:
        return resolve_model_for_user_and_project(
            self.db,
            user_id=user_id,
            project_id=project_id,
            capability="chat",
        )

    def build_messages(self, content: str) -> list[dict[str, str]]:
        text = self.validate_content(content)
        return [
            {"role": "system", "content": _ANALYZE_PREVIEW_SYSTEM},
            {"role": "user", "content": text[:30000]},
        ]

    async def execute_preview(self, *, model: ResolvedModel, content: str) -> tuple[NovelIntakePreviewResponse, str]:
        text = self.validate_content(content)
        client = ModelClient(timeout=60.0, retries=1)
        response = await client.chat(
            model,
            messages=self.build_messages(text),
            temperature=0.4,
        )
        raw_content = _extract_content(response)
        payload = _safe_json(raw_content)
        preview = self.normalize_preview(model=model, content=text, payload=payload)
        return preview, raw_content

    def normalize_preview(
        self, *, model: ResolvedModel, content: str, payload: dict[str, Any]
    ) -> NovelIntakePreviewResponse:
        text = self.validate_content(content)
        analysis_payload = payload.get("analysis") if isinstance(payload, dict) else None
        split_payload = payload.get("split_episodes") if isinstance(payload, dict) else None
        normalized_splits = _normalize_split_episodes(split_payload, text)
        analysis = _normalize_analysis(analysis_payload, text, normalized_splits)
        return NovelIntakePreviewResponse(
            analysis=NovelIntakeAnalysis.model_validate(analysis),
            split_episodes=[NovelIntakeSplitEpisode.model_validate(item) for item in normalized_splits],
            model_used=model.model_id,
            request_url=model.full_url,
        )

    async def analyze(self, *, user_id: str, project_id: str, content: str) -> NovelIntakePreviewResponse:
        text = self.validate_content(content)
        model = self.resolve_model(user_id=user_id, project_id=project_id)
        preview, _raw_content = await self.execute_preview(model=model, content=text)
        return preview


def _extract_content(response: dict[str, Any]) -> str:
    try:
        return response["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError):
        return ""


def _safe_json(raw: str) -> dict[str, Any]:
    raw = raw.strip()
    if raw.startswith("```"):
        raw = raw.strip("`")
        if raw.lower().startswith("json"):
            raw = raw[4:].strip()
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        start, end = raw.find("{"), raw.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(raw[start : end + 1])
            except json.JSONDecodeError:
                pass
    return {}


def _count_words(text: str) -> int:
    if not text:
        return 0
    english_word_count = 0

    def _replace(_: re.Match[str]) -> str:
        nonlocal english_word_count
        english_word_count += 1
        return ""

    text_without_english = re.sub(r"[a-zA-Z0-9]+", _replace, text)
    chinese_count = len(re.findall(r"[\u4e00-\u9fa5\u3400-\u4dbf]", text_without_english))
    return english_word_count + chinese_count


def _clamp_ratio(value: Any) -> float:
    try:
        number = float(value)
    except (TypeError, ValueError):
        return 0.0
    return max(0.0, min(1.0, number))


def _normalize_split_episodes(raw: Any, original_text: str) -> list[dict[str, Any]]:
    if not isinstance(raw, list):
        raw = []
    episodes: list[dict[str, Any]] = []
    for index, item in enumerate(raw, start=1):
        if not isinstance(item, dict):
            continue
        content = str(item.get("content") or "").strip()
        if not content:
            continue
        title = str(item.get("title") or "").strip() or f"第 {index} 集"
        summary = str(item.get("summary") or "").strip()
        number = item.get("number")
        try:
            number_int = int(number)
        except (TypeError, ValueError):
            number_int = index
        episodes.append(
            {
                "number": max(1, number_int),
                "title": title,
                "summary": summary,
                "content": content,
                "wordCount": _count_words(content),
            }
        )
    if episodes:
        return episodes
    trimmed = original_text.strip()
    return [
        {
            "number": 1,
            "title": "第 1 集",
            "summary": trimmed[:30].strip() + ("..." if len(trimmed) > 30 else ""),
            "content": trimmed,
            "wordCount": _count_words(trimmed),
        }
    ]


def _normalize_analysis(raw: Any, original_text: str, split_episodes: list[dict[str, Any]]) -> dict[str, Any]:
    payload = raw if isinstance(raw, dict) else {}
    text = original_text.strip()
    paragraphs = [part for part in re.split(r"\n+", text) if part.strip()]
    sentences = [part for part in re.split(r"[。！？!?…]+", text) if part.strip()]
    total_chars = len(text)
    total_words = _count_words(text)

    dialogue = payload.get("dialogue") if isinstance(payload.get("dialogue"), dict) else {}
    characters = payload.get("characters") if isinstance(payload.get("characters"), list) else []
    scenes = payload.get("scenes") if isinstance(payload.get("scenes"), list) else []
    keywords = payload.get("keywords") if isinstance(payload.get("keywords"), list) else []
    emotions = payload.get("emotions") if isinstance(payload.get("emotions"), list) else []

    normalized_characters = []
    for item in characters[:10]:
        if not isinstance(item, dict) or not str(item.get("name") or "").strip():
            continue
        normalized_characters.append(
            {
                "name": str(item.get("name") or "").strip(),
                "lineCount": max(0, int(item.get("lineCount") or 0)),
                "wordCount": max(0, int(item.get("wordCount") or 0)),
                "sampleQuote": str(item.get("sampleQuote")).strip() if item.get("sampleQuote") else None,
                "firstAppearanceRatio": _clamp_ratio(item.get("firstAppearanceRatio")),
            }
        )

    normalized_scenes = []
    for index, item in enumerate(scenes[:8], start=1):
        if not isinstance(item, dict) or not str(item.get("location") or "").strip():
            continue
        normalized_scenes.append(
            {
                "index": index,
                "location": str(item.get("location") or "").strip(),
                "positionRatio": _clamp_ratio(item.get("positionRatio")),
                "preview": str(item.get("preview") or "").strip()[:80],
            }
        )

    normalized_keywords = []
    seen_words: set[str] = set()
    for item in keywords[:12]:
        if not isinstance(item, dict):
            continue
        word = str(item.get("word") or "").strip()
        if not word or word in seen_words or word in _STOP_WORDS:
            continue
        seen_words.add(word)
        normalized_keywords.append({"word": word, "frequency": max(1, int(item.get("frequency") or 1))})

    normalized_emotions = []
    for item in emotions:
        if not isinstance(item, dict):
            continue
        key = str(item.get("key") or "").strip()
        label = str(item.get("label") or "").strip()
        if not key or not label:
            continue
        normalized_emotions.append({"key": key, "label": label, "count": max(0, int(item.get("count") or 0))})

    pace = str(payload.get("pace") or "steady").strip().lower()
    if pace not in {"slow", "steady", "fast"}:
        pace = "steady"

    sentiment_score = payload.get("sentimentScore")
    try:
        sentiment = float(sentiment_score)
    except (TypeError, ValueError):
        sentiment = 0.0
    sentiment = max(-1.0, min(1.0, sentiment))

    return {
        "totalChars": int(payload.get("totalChars") or total_chars),
        "totalWords": int(payload.get("totalWords") or total_words),
        "paragraphCount": int(payload.get("paragraphCount") or len(paragraphs)),
        "sentenceCount": int(payload.get("sentenceCount") or len(sentences)),
        "characters": normalized_characters,
        "scenes": normalized_scenes,
        "dialogue": {
            "totalLines": max(0, int(dialogue.get("totalLines") or 0)),
            "averageLength": max(0, int(dialogue.get("averageLength") or 0)),
            "longestLength": max(0, int(dialogue.get("longestLength") or 0)),
            "ratioOfTotalText": _clamp_ratio(dialogue.get("ratioOfTotalText")),
        },
        "keywords": normalized_keywords,
        "emotions": normalized_emotions,
        "genre": str(payload.get("genre") or "综合").strip() or "综合",
        "sentimentScore": sentiment,
        "pace": pace,
    }

