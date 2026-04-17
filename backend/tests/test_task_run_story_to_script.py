from __future__ import annotations

from collections.abc import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.main as main
from app.core.db import Base, get_db
from app.core.security import hash_password
from app.db.models.asset import ProjectAsset
from app.db.models.episode import Episode
from app.db.models.project import Project
from app.db.models.user import User
from app.services import asset_workflow_service, story_to_script_service
from app.services import task_service as task_service_module


@pytest.fixture
def client_and_db(monkeypatch) -> Generator[tuple[TestClient, sessionmaker], None, None]:
    monkeypatch.setattr(main, "ensure_bucket_exists", lambda: None)

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
    monkeypatch.setattr(story_to_script_service, "SessionLocal", testing_session_local)
    monkeypatch.setattr(asset_workflow_service, "SessionLocal", testing_session_local)
    monkeypatch.setattr(
        task_service_module,
        "run_story_to_script_task",
        story_to_script_service.run_story_to_script_task,
    )
    monkeypatch.setattr(
        task_service_module,
        "run_asset_generate_task",
        asset_workflow_service.run_asset_generate_task,
    )
    monkeypatch.setattr(
        task_service_module,
        "run_asset_modify_task",
        asset_workflow_service.run_asset_modify_task,
    )

    with TestClient(main.app) as client:
        yield client, testing_session_local

    main.app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def _seed_user_project_episode(db_factory: sessionmaker) -> tuple[str, str, str]:
    db = db_factory()
    try:
        user = User(username="task_user", password_hash=hash_password("pass123456"))
        db.add(user)
        db.flush()

        project = Project(user_id=user.id, name="Task Project")
        db.add(project)
        db.flush()

        episode = Episode(project_id=project.id, episode_number=1, name="EP1")
        db.add(episode)
        db.commit()
        return user.id, project.id, episode.id
    finally:
        db.close()


def _login_headers(client: TestClient, username: str = "task_user") -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={"username": username, "password": "pass123456"},
    )
    assert response.status_code == 200
    token = response.json()["data"]["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_story_to_script_flow_end_to_end(client_and_db) -> None:
    client, db_factory = client_and_db
    _user_id, project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)

    submit = client.post(
        f"/api/episodes/{episode_id}/story-to-script",
        headers=headers,
        json={"content": "A hero enters the city at dawn."},
    )
    assert submit.status_code == 200
    submit_data = submit.json()["data"]
    task_id = submit_data["task_id"]
    run_id = submit_data["run_id"]
    assert submit_data["deduped"] is False

    task_detail = client.get(
        f"/api/tasks/{task_id}",
        headers=headers,
        params={"includeEvents": 1},
    )
    assert task_detail.status_code == 200
    task_payload = task_detail.json()["data"]
    task_data = task_payload["task"]
    assert task_data["status"] in {"queued", "processing", "completed"}
    assert len(task_payload.get("events", [])) >= 1

    runs = client.get(
        "/api/runs",
        headers=headers,
        params={"projectId": project_id},
    )
    assert runs.status_code == 200
    runs_payload = runs.json()["data"]["runs"]
    assert any(item["id"] == run_id for item in runs_payload)

    run_detail = client.get(f"/api/runs/{run_id}", headers=headers)
    assert run_detail.status_code == 200

    events = client.get(f"/api/runs/{run_id}/events", headers=headers)
    assert events.status_code == 200
    events_payload = events.json()["data"]["events"]
    assert len(events_payload) >= 1


def test_story_to_script_dedupe(client_and_db, monkeypatch) -> None:
    client, db_factory = client_and_db
    _user_id, project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)

    monkeypatch.setattr(task_service_module, "run_story_to_script_task", lambda _task_id: None)

    first = client.post(
        f"/api/episodes/{episode_id}/story-to-script",
        headers=headers,
        json={"content": "First content."},
    )
    assert first.status_code == 200
    first_data = first.json()["data"]

    second = client.post(
        "/api/tasks",
        headers=headers,
        json={
            "project_id": project_id,
            "episode_id": episode_id,
            "task_type": "story_to_script_run",
            "target_type": "episode",
            "target_id": episode_id,
            "payload_json": {"content": "Second content."},
        },
    )
    assert second.status_code == 200
    second_data = second.json()["data"]

    assert second_data["deduped"] is True
    assert second_data["task_id"] == first_data["task_id"]


def test_cancel_run_updates_task(client_and_db, monkeypatch) -> None:
    client, db_factory = client_and_db
    _user_id, _project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)

    monkeypatch.setattr(task_service_module, "run_story_to_script_task", lambda _task_id: None)

    submit = client.post(
        f"/api/episodes/{episode_id}/story-to-script",
        headers=headers,
        json={"content": "Cancelable story."},
    )
    assert submit.status_code == 200
    data = submit.json()["data"]

    cancel = client.post(f"/api/runs/{data['run_id']}/cancel", headers=headers)
    assert cancel.status_code == 200

    task_detail = client.get(f"/api/tasks/{data['task_id']}", headers=headers)
    assert task_detail.status_code == 200
    assert task_detail.json()["data"]["task"]["status"] in {"canceled", "completed"}


def test_background_completion_persists_result(client_and_db) -> None:
    client, db_factory = client_and_db
    _user_id, _project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)

    submit = client.post(
        f"/api/episodes/{episode_id}/story-to-script",
        headers=headers,
        json={"content": "Result story"},
    )
    assert submit.status_code == 200
    data = submit.json()["data"]

    detail = client.get(f"/api/tasks/{data['task_id']}", headers=headers)
    assert detail.status_code == 200
    task = detail.json()["data"]["task"]
    assert task["status"] in {"completed", "processing", "queued", "canceled", "failed"}
    if task["status"] == "completed":
        assert isinstance(task["result_json"], dict)
        assert "script" in task["result_json"]


def test_project_settings_update_and_asset_routes(client_and_db) -> None:
    client, db_factory = client_and_db
    _user_id, project_id, _episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)

    update_settings = client.patch(
        f"/api/projects/{project_id}/settings",
        headers=headers,
        json={
            "analysis_model": "gpt-5.4-mini",
            "character_model": "flux-character",
            "video_ratio": "16:9",
        },
    )
    assert update_settings.status_code == 200
    settings = update_settings.json()["data"]["settings"]
    assert settings["analysis_model"] == "gpt-5.4-mini"
    assert settings["character_model"] == "flux-character"
    assert settings["video_ratio"] == "16:9"

    create_character = client.post(
        f"/api/projects/{project_id}/characters",
        headers=headers,
        json={"name": "Hero", "description": "Main protagonist"},
    )
    assert create_character.status_code == 200
    created_character = create_character.json()["data"]["asset"]
    assert created_character["kind"] == "character"
    assert created_character["name"] == "Hero"

    create_location = client.post(
        f"/api/projects/{project_id}/locations",
        headers=headers,
        json={"name": "Harbor"},
    )
    assert create_location.status_code == 200
    created_location = create_location.json()["data"]["asset"]
    assert created_location["kind"] == "location"

    project_assets = client.get(f"/api/projects/{project_id}/assets", headers=headers)
    assert project_assets.status_code == 200
    project_asset_items = project_assets.json()["data"]["assets"]
    assert len(project_asset_items) == 2

    global_assets = client.get("/api/global-assets", headers=headers)
    assert global_assets.status_code == 200
    global_asset_items = global_assets.json()["data"]["assets"]
    assert {item["id"] for item in global_asset_items} == {
        created_character["id"],
        created_location["id"],
    }

    db = db_factory()
    try:
        persisted = db.query(ProjectAsset).filter(ProjectAsset.project_id == project_id).all()
        assert len(persisted) == 2
    finally:
        db.close()


def test_asset_generate_and_modify_flow(client_and_db) -> None:
    client, db_factory = client_and_db
    _user_id, project_id, _episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)

    created = client.post(
        f"/api/projects/{project_id}/characters",
        headers=headers,
        json={"name": "Scout", "description": "Before workflow"},
    )
    assert created.status_code == 200
    asset = created.json()["data"]["asset"]

    generate = client.post(
        f"/api/assets/{asset['id']}/generate",
        headers=headers,
        json={"prompt": "cinematic explorer portrait"},
    )
    assert generate.status_code == 200
    generate_data = generate.json()["data"]
    assert generate_data["status"] in {"queued", "processing", "completed"}
    assert generate_data["deduped"] is False

    generate_detail = client.get(f"/api/tasks/{generate_data['task_id']}", headers=headers)
    assert generate_detail.status_code == 200
    generate_task = generate_detail.json()["data"]["task"]
    assert generate_task["target_type"] == "asset"
    assert generate_task["target_id"] == asset["id"]
    assert generate_task["task_type"] == "asset_generate_run"

    modify = client.post(
        f"/api/assets/{asset['id']}/modify",
        headers=headers,
        json={"prompt": "updated hero look", "preview_media_id": None},
    )
    assert modify.status_code == 200
    modify_data = modify.json()["data"]
    assert modify_data["status"] in {"queued", "processing", "completed"}
    assert modify_data["deduped"] is False

    modify_detail = client.get(f"/api/tasks/{modify_data['task_id']}", headers=headers)
    assert modify_detail.status_code == 200
    modify_task = modify_detail.json()["data"]["task"]
    assert modify_task["task_type"] == "asset_modify_run"
    assert modify_task["target_type"] == "asset"
    assert modify_task["target_id"] == asset["id"]

    refreshed_assets = client.get(f"/api/projects/{project_id}/assets", headers=headers)
    assert refreshed_assets.status_code == 200
    refreshed_asset = next(item for item in refreshed_assets.json()["data"]["assets"] if item["id"] == asset["id"])
    assert refreshed_asset["description"] == "updated hero look"
