"""Analyze pipeline: novel text → structured clips/characters/locations."""

from __future__ import annotations

import json

from app.db.models.novel_promotion import NovelPromotionClip, NovelPromotionEpisode
from app.services.novel_promotion.intake_preview import IntakePreviewService
from app.workers.handlers.base import make_client, progress, resolve_model_for_capability
from app.workers.registry import TaskContext, handler

_ANALYZE_SYSTEM = (
    "You are an assistant that reads a short-form novel chapter and extracts a "
    "JSON plan for video production. Output STRICT JSON with keys: "
    "characters (list of {name,introduction}), locations (list of {name,summary}), "
    "clips (list of {summary,content,location}). Respond with JSON only, no prose."
)

_SCREENPLAY_SYSTEM = (
    "你是资深短剧/小说推文改编师，专长把小说章节里已切分出的单个片段（clip）改写成"
    "可直接用于分镜与拍摄的短剧剧本片段（30–90 秒量级）。\n"
    "\n"
    "【输入】用户消息里会给你两块内容：\n"
    "  1. 整章小说原文节选，用作上下文；\n"
    "  2. 需要改写的单个片段，含 summary（摘要）、content（原文节选）、location（场景）。\n"
    "\n"
    "【输出】必须仅输出一个 JSON 对象，无任何前后缀、解释、markdown 围栏。键名固定为：\n"
    "  - screenplay (string)：整段可拍摄剧本。中文书写，遵守以下格式：\n"
    "      第一行为 `场景：<时间/地点/氛围一句话>`；\n"
    "      其后按时间顺序交替给出 `[动作]` 与 `角色名：\"台词\"`，"
    "      动作里可用（特写/推镜/拉镜/切/慢镜）等镜头语言；\n"
    "      结尾给一个 1 句话的情绪钩子；\n"
    "      整段中文长度控制在 300–800 字；严禁整段照抄原文，要凝练、可拍摄、有画面感。\n"
    "  - characters (string[])：本片段出场人物姓名数组；指代词（他/她/少年/女子）应根据上下文还原为原文里已有的具体姓名；没有命名的人物不要编造，也不要包含旁白/作者。\n"
    "  - props (string[])：本片段出现的关键道具/物件（如 \"手机\"、\"佩剑\"、\"血字字条\"）；没有就返回 []。\n"
    "  - start_text (string)：该片段的开场引入句（1–2 句中文），用于视频开头旁白，要有钩子和场景感。\n"
    "  - end_text (string)：该片段的收尾句（1–2 句中文），用于视频结尾旁白，要留悬念或情绪余韵。\n"
    "  - shot_count (integer)：建议将该片段拆分为多少个镜头，依据动作/对话密度在 3–10 之间取整数。\n"
    "\n"
    "【创作约束】\n"
    "  - 保留原文的情节转折、人物情感与关键信息，不自行添加原文没有的情节或角色；\n"
    "  - 台词要口语化，但人物身份、关系、称谓必须与原文一致；\n"
    "  - 场景地点与输入的 location 保持一致；location 为空时从 content 合理推断；\n"
    "  - 不要出现 \"作者\"、\"旁白\"、\"读者\" 等跳出叙事的词；\n"
    "  - 不要输出注释、不要输出 JSON 以外的任何字符。"
)


@handler("np_intake_preview")
async def intake_preview(ctx: TaskContext) -> dict:
    content = str(ctx.payload.get("content") or "").strip()
    if not content:
        raise ValueError("intake preview requires content")

    service = IntakePreviewService(ctx.db)
    progress(ctx, "resolve-model", 5)
    model = service.resolve_model(user_id=ctx.user_id, project_id=ctx.project_id)

    progress(ctx, "prepare-input", 15)
    messages = service.build_messages(content)

    progress(ctx, "llm-call", 55, f"model={model.model_id}")
    client = make_client()
    response = await client.chat(model, messages=messages, temperature=0.4)

    progress(ctx, "parse-output", 75)
    raw_content = _extract_content(response)
    payload = _safe_json(raw_content)

    progress(ctx, "normalize-preview", 90)
    preview = service.normalize_preview(model=model, content=content, payload=payload)

    progress(ctx, "completed", 100)
    return preview.model_dump()


@handler("np_analyze")
async def analyze(ctx: TaskContext) -> dict:
    episode_id = ctx.payload.get("episode_id") or (
        ctx.task.episode_id if ctx.task.target_type == "np_episode" else None
    )
    if not episode_id:
        raise ValueError("analyze requires episode_id")

    ep = ctx.db.query(NovelPromotionEpisode).filter(NovelPromotionEpisode.id == episode_id).first()
    if ep is None:
        raise ValueError(f"episode {episode_id} not found")
    if not ep.novel_text:
        raise ValueError("episode has no novel_text to analyze")

    progress(ctx, "resolve-model", 5)
    model = resolve_model_for_capability(ctx, "chat")

    progress(ctx, "llm-call", 20, f"model={model.model_id}")
    client = make_client()
    response = await client.chat(
        model,
        messages=[
            {"role": "system", "content": _ANALYZE_SYSTEM},
            {"role": "user", "content": ep.novel_text[:8000]},
        ],
        temperature=0.3,
    )

    content = _extract_content(response)
    parsed = _safe_json(content)
    progress(ctx, "persist", 80, "writing characters/locations/clips")
    created = _persist_analysis(ctx, ep, parsed)

    return {
        "model_used": model.model_id,
        "request_url": model.full_url,
        "counts": created,
        "raw_preview": content[:500] if content else None,
    }


@handler("np_analyze_global")
async def analyze_global(ctx: TaskContext) -> dict:
    progress(ctx, "noop", 100, "analyze_global is project-level aggregation; no-op placeholder")
    return {"note": "analyze_global aggregates per-episode results; run after np_analyze."}


@handler("np_screenplay_conversion")
async def screenplay_conversion(ctx: TaskContext) -> dict:
    episode_id = ctx.payload.get("episode_id") or (
        ctx.task.episode_id if ctx.task.target_type == "np_episode" else None
    )
    if not episode_id:
        raise ValueError("screenplay_conversion requires episode_id")

    ep = ctx.db.query(NovelPromotionEpisode).filter(NovelPromotionEpisode.id == episode_id).first()
    if ep is None:
        raise ValueError(f"episode {episode_id} not found")

    clips = (
        ctx.db.query(NovelPromotionClip)
        .filter(NovelPromotionClip.episode_id == episode_id)
        .order_by(NovelPromotionClip.created_at.asc())
        .all()
    )
    if not clips:
        raise ValueError("run np_analyze first to produce clips before screenplay conversion")

    progress(ctx, "resolve-model", 5)
    model = resolve_model_for_capability(ctx, "chat")
    client = make_client()

    novel_context = (ep.novel_text or "")[:8000]
    total = len(clips)
    updated = 0
    for index, clip in enumerate(clips):
        stage_pct = 10 + int(80 * index / total)
        progress(ctx, "llm-call", stage_pct, f"clip {index + 1}/{total}")
        resp = await client.chat(
            model,
            messages=[
                {"role": "system", "content": _SCREENPLAY_SYSTEM},
                {"role": "user", "content": _build_clip_user_msg(novel_context, clip)},
            ],
            temperature=0.6,
        )
        parsed = _safe_json(_extract_content(resp))
        if _apply_screenplay(clip, parsed):
            updated += 1
            ctx.db.add(clip)

    ctx.db.commit()
    progress(ctx, "persist", 100, f"updated {updated}/{total} clips")
    return {
        "model_used": model.model_id,
        "request_url": model.full_url,
        "episode_id": episode_id,
        "clips_total": total,
        "clips_updated": updated,
    }


@handler("np_story_to_script_stream")
async def story_to_script_stream(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "story_to_script streaming handler stub"}


@handler("np_script_to_storyboard_stream")
async def script_to_storyboard_stream(ctx: TaskContext) -> dict:
    progress(ctx, "stub", 100)
    return {"note": "script_to_storyboard streaming handler stub"}


# ------- helpers -------


def _extract_content(response: dict) -> str:
    try:
        return response["choices"][0]["message"]["content"] or ""
    except (KeyError, IndexError, TypeError):
        return ""


def _safe_json(raw: str) -> dict:
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


def _persist_analysis(ctx: TaskContext, episode, parsed: dict) -> dict:
    from app.db.models.novel_promotion import (
        NovelPromotionCharacter,
        NovelPromotionClip,
        NovelPromotionLocation,
        NovelPromotionProject,
    )

    np = (
        ctx.db.query(NovelPromotionProject)
        .filter(NovelPromotionProject.project_id == ctx.project_id)
        .first()
    )
    if np is None:
        np = NovelPromotionProject(project_id=ctx.project_id)
        ctx.db.add(np)
        ctx.db.flush()

    char_count = 0
    for item in parsed.get("characters") or []:
        if not isinstance(item, dict) or not item.get("name"):
            continue
        existing = (
            ctx.db.query(NovelPromotionCharacter)
            .filter(
                NovelPromotionCharacter.np_project_id == np.id,
                NovelPromotionCharacter.name == item["name"],
            )
            .first()
        )
        if existing:
            continue
        ctx.db.add(
            NovelPromotionCharacter(
                np_project_id=np.id,
                name=item["name"][:200],
                introduction=item.get("introduction"),
            )
        )
        char_count += 1

    loc_count = 0
    for item in parsed.get("locations") or []:
        if not isinstance(item, dict) or not item.get("name"):
            continue
        existing = (
            ctx.db.query(NovelPromotionLocation)
            .filter(
                NovelPromotionLocation.np_project_id == np.id,
                NovelPromotionLocation.name == item["name"],
            )
            .first()
        )
        if existing:
            continue
        ctx.db.add(
            NovelPromotionLocation(
                np_project_id=np.id,
                name=item["name"][:200],
                summary=item.get("summary"),
            )
        )
        loc_count += 1

    clip_count = 0
    for item in parsed.get("clips") or []:
        if not isinstance(item, dict):
            continue
        ctx.db.add(
            NovelPromotionClip(
                episode_id=episode.id,
                summary=(item.get("summary") or "")[:4000],
                content=(item.get("content") or "")[:8000],
                location=item.get("location"),
            )
        )
        clip_count += 1

    ctx.db.commit()
    return {"characters": char_count, "locations": loc_count, "clips": clip_count}


def _build_clip_user_msg(novel_context: str, clip: NovelPromotionClip) -> str:
    clip_block = json.dumps(
        {
            "summary": clip.summary or "",
            "content": clip.content or "",
            "location": clip.location or "",
        },
        ensure_ascii=False,
    )
    return (
        "【小说原文（上下文节选）】\n"
        f"{novel_context}\n\n"
        "【需要改写为短剧剧本的片段】\n"
        f"{clip_block}"
    )


def _apply_screenplay(clip: NovelPromotionClip, parsed: dict) -> bool:
    if not isinstance(parsed, dict):
        return False

    screenplay = parsed.get("screenplay")
    if not (isinstance(screenplay, str) and screenplay.strip()):
        return False
    clip.screenplay = screenplay.strip()[:16000]

    characters = parsed.get("characters")
    if isinstance(characters, list):
        names = [str(n).strip() for n in characters if str(n).strip()]
        if names:
            clip.characters = json.dumps(names, ensure_ascii=False)

    props = parsed.get("props")
    if isinstance(props, list):
        items = [str(p).strip() for p in props if str(p).strip()]
        clip.props = json.dumps(items, ensure_ascii=False)

    start_text = parsed.get("start_text")
    if isinstance(start_text, str) and start_text.strip():
        clip.start_text = start_text.strip()[:2000]

    end_text = parsed.get("end_text")
    if isinstance(end_text, str) and end_text.strip():
        clip.end_text = end_text.strip()[:2000]

    shot_count = parsed.get("shot_count")
    if isinstance(shot_count, int):
        clip.shot_count = max(1, min(30, shot_count))
    elif isinstance(shot_count, str) and shot_count.strip().isdigit():
        clip.shot_count = max(1, min(30, int(shot_count.strip())))

    return True
