from __future__ import annotations

import asyncio
from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main
from app.core.db import Base, get_db
from app.core.security import hash_password
from app.db.models.model_gateway import ModelConfig, ModelProvider
from app.db.models.project import Project, ProjectSettings
from app.db.models.task import Task, TaskEvent
from app.db.models.user import User, UserPreference
from app.services.novel_promotion.intake_preview import IntakePreviewService, _safe_json
from app.workers import runner as worker_runner


@pytest.fixture
def client_and_db(monkeypatch) -> Generator[tuple[TestClient, sessionmaker], None, None]:
    monkeypatch.setattr(main, "ensure_bucket_exists", lambda: None)
    monkeypatch.setattr(worker_runner, "start_worker", lambda: None, raising=False)
    monkeypatch.setattr(worker_runner, "stop_worker", lambda: None, raising=False)
    monkeypatch.setattr(main, "start_worker", lambda: None)

    async def _stop_worker() -> None:
        return None

    monkeypatch.setattr(main, "stop_worker", _stop_worker)

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    testing_session_local = sessionmaker(
        bind=engine,
        autoflush=False,
        autocommit=False,
        expire_on_commit=False,
    )
    Base.metadata.create_all(bind=engine)

    def override_get_db() -> Generator[Session, None, None]:
        db = testing_session_local()
        try:
            yield db
        finally:
            db.close()

    main.app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(worker_runner, "SessionLocal", testing_session_local)
    with TestClient(main.app) as client:
        yield client, testing_session_local

    main.app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _login_headers(client: TestClient, username: str = "preview_user") -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": "pass123456"},
    )
    assert response.status_code == 200
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def _seed_user_project_models(db_factory: sessionmaker) -> tuple[str, str, str, str]:
    db = db_factory()
    try:
        user = User(username="preview_user", password_hash=hash_password("pass123456"))
        db.add(user)
        db.flush()

        project = Project(user_id=user.id, name="Preview Project")
        db.add(project)
        db.flush()

        db.add(ProjectSettings(project_id=project.id, analysis_model="project-chat"))
        db.add(UserPreference(user_id=user.id, analysis_model="user-chat"))

        provider = ModelProvider(
            user_id=user.id,
            name="Test Provider",
            base_url="https://example.test/v1",
            api_key_encrypted="",
        )
        db.add(provider)
        db.flush()

        project_model = ModelConfig(
            user_id=user.id,
            provider_id=provider.id,
            model_id="project-chat",
            display_name="Project Chat",
            capability="chat",
            protocol="openai",
            request_path="/chat/completions",
            enabled=True,
        )
        fallback_model = ModelConfig(
            user_id=user.id,
            provider_id=provider.id,
            model_id="fallback-chat",
            display_name="Fallback Chat",
            capability="chat",
            protocol="openai",
            request_path="/chat/completions",
            enabled=True,
        )
        db.add_all([project_model, fallback_model])
        db.commit()
        return user.id, project.id, project_model.id, fallback_model.id
    finally:
        db.close()


def test_safe_json_extracts_markdown_wrapped_json() -> None:
    payload = _safe_json("```json\n{\"analysis\": {\"genre\": \"悬疑\"}}\n```")
    assert payload["analysis"]["genre"] == "悬疑"


def test_intake_preview_prefers_project_analysis_model(client_and_db, monkeypatch) -> None:
    _client, db_factory = client_and_db
    user_id, project_id, project_model_id, _fallback_model_id = _seed_user_project_models(db_factory)
    db = db_factory()
    try:
        captured: dict[str, str] = {}

        async def fake_chat(self, model, messages, temperature=None, extra=None):
            captured["model_id"] = model.model_id
            captured["url"] = model.full_url
            return {
                "choices": [
                    {
                        "message": {
                            "content": '{"analysis":{"genre":"都市","pace":"steady","dialogue":{"totalLines":3,"averageLength":12,"longestLength":18,"ratioOfTotalText":0.2},"characters":[{"name":"小明","lineCount":2,"wordCount":8,"sampleQuote":"快走","firstAppearanceRatio":0.1}],"scenes":[{"index":1,"location":"公司","positionRatio":0.2,"preview":"清晨来到公司"}],"keywords":[{"word":"公司","frequency":4}],"emotions":[{"key":"tense","label":"紧张","count":2}],"sentimentScore":0.2},"split_episodes":[{"number":1,"title":"第 1 集","summary":"开端","content":"第一段剧情","wordCount":5}]}'
                        }
                    }
                ]
            }

        monkeypatch.setattr("app.services.novel_promotion.intake_preview.ModelClient.chat", fake_chat)

        service = IntakePreviewService(db)
        result = asyncio.run(
            service.analyze(user_id=user_id, project_id=project_id, content="这是一段足够长的正文内容。" * 20)
        )

        assert captured["model_id"] == "project-chat"
        assert result.model_used == "project-chat"
        assert result.analysis.genre == "都市"
        assert result.split_episodes[0].title == "第 1 集"
        assert result.request_url.endswith("/chat/completions")
        assert project_model_id
    finally:
        db.close()


def test_intake_preview_route_queues_task(client_and_db) -> None:
    client, db_factory = client_and_db
    _user_id, project_id, _project_model_id, _fallback_model_id = _seed_user_project_models(db_factory)
    headers = _login_headers(client)

    response = client.post(
        f"/api/novel-promotion/{project_id}/intake-preview",
        headers=headers,
        json={"content": "这是一段足够长的正文内容。" * 20},
    )
    assert response.status_code == 200
    data = response.json()["data"]
    assert data["status"] == "queued"
    assert data["task_id"]

    task_detail = client.get(
        f"/api/tasks/{data['task_id']}",
        headers=headers,
        params={"includeEvents": 1},
    )
    assert task_detail.status_code == 200
    detail_payload = task_detail.json()["data"]
    assert detail_payload["task"]["task_type"] == "np_intake_preview"
    assert detail_payload["task"]["status"] == "queued"
    assert detail_payload["events"][0]["payload_json"]["stage"] == "queued"


def test_np_intake_preview_worker_persists_progress_and_result(client_and_db, monkeypatch) -> None:
    client, db_factory = client_and_db
    _user_id, project_id, _project_model_id, _fallback_model_id = _seed_user_project_models(db_factory)
    headers = _login_headers(client)

    class FakeClient:
        async def chat(self, model, messages, temperature=None, extra=None):
            return {
                "choices": [
                    {
                        "message": {
                            "content": '{"analysis":{"genre":"综合","pace":"steady","dialogue":{"totalLines":1,"averageLength":8,"longestLength":8,"ratioOfTotalText":0.1},"characters":[],"scenes":[],"keywords":[],"emotions":[],"sentimentScore":0},"split_episodes":[{"number":1,"title":"第 1 集","summary":"摘要","content":"正文片段","wordCount":4}]}'
                        }
                    }
                ]
            }

    monkeypatch.setattr("app.workers.handlers.analyze.make_client", lambda: FakeClient())

    response = client.post(
        f"/api/novel-promotion/{project_id}/intake-preview",
        headers=headers,
        json={"content": "这是一段足够长的正文内容。" * 20},
    )
    assert response.status_code == 200
    task_id = response.json()["data"]["task_id"]

    asyncio.run(worker_runner._run_task(task_id))

    db = db_factory()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        assert task is not None
        assert task.status == "completed"
        assert task.result_json is not None
        assert task.result_json["model_used"] == "project-chat"
        assert task.result_json["analysis"]["genre"] == "综合"
        assert task.result_json["split_episodes"][0]["title"] == "第 1 集"

        events = (
            db.query(TaskEvent)
            .filter(TaskEvent.task_id == task_id)
            .order_by(TaskEvent.id.asc())
            .all()
        )
        stages = [((item.payload_json or {}).get("stage")) for item in events]
        event_types = [item.event_type for item in events]

        assert "resolve-model" in stages
        assert "llm-call" in stages
        assert "completed" in stages
        assert "task.completed" in event_types
    finally:
        db.close()
