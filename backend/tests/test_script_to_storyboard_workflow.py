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
from app.db.models.episode import Episode
from app.db.models.project import Project
from app.db.models.user import User
from app.services import script_to_storyboard_service
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
    monkeypatch.setattr(script_to_storyboard_service, "SessionLocal", testing_session_local)
    monkeypatch.setattr(
        task_service_module,
        "run_script_to_storyboard_task",
        script_to_storyboard_service.run_script_to_storyboard_task,
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


def test_script_to_storyboard_flow_end_to_end(client_and_db) -> None:
    client, db_factory = client_and_db
    _user_id, _project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)

    submit = client.post(
        f"/api/episodes/{episode_id}/script-to-storyboard",
        headers=headers,
        json={"script": "A hero enters. She looks around. The city wakes up."},
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

    run_detail = client.get(f"/api/runs/{run_id}", headers=headers)
    assert run_detail.status_code == 200

    run_events = client.get(f"/api/runs/{run_id}/events", headers=headers)
    assert run_events.status_code == 200
    assert len(run_events.json()["data"]["events"]) >= 1


def test_script_to_storyboard_dedupe_via_tasks_api(client_and_db, monkeypatch) -> None:
    client, db_factory = client_and_db
    _user_id, project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)

    monkeypatch.setattr(task_service_module, "run_script_to_storyboard_task", lambda _task_id: None)

    first = client.post(
        f"/api/episodes/{episode_id}/script-to-storyboard",
        headers=headers,
        json={"script": "First storyboard script."},
    )
    assert first.status_code == 200
    first_data = first.json()["data"]

    second = client.post(
        "/api/tasks",
        headers=headers,
        json={
            "project_id": project_id,
            "episode_id": episode_id,
            "task_type": "script_to_storyboard_run",
            "target_type": "episode",
            "target_id": episode_id,
            "payload_json": {"script": "Second storyboard script."},
        },
    )
    assert second.status_code == 200
    second_data = second.json()["data"]

    assert second_data["deduped"] is True
    assert second_data["task_id"] == first_data["task_id"]


def test_storyboards_and_panel_update_contract(client_and_db) -> None:
    client, db_factory = client_and_db
    _user_id, _project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)

    submit = client.post(
        f"/api/episodes/{episode_id}/script-to-storyboard",
        headers=headers,
        json={"script": "One. Two. Three."},
    )
    assert submit.status_code == 200

    boards = client.get(f"/api/episodes/{episode_id}/storyboards", headers=headers)
    assert boards.status_code == 200
    storyboard_items = boards.json()["data"]["storyboards"]
    assert len(storyboard_items) >= 1

    storyboard_id = storyboard_items[0]["id"]
    board_detail = client.get(f"/api/storyboards/{storyboard_id}", headers=headers)
    assert board_detail.status_code == 200
    storyboard = board_detail.json()["data"]["storyboard"]
    assert storyboard["id"] == storyboard_id
    assert len(storyboard["panels"]) >= 1

    panel_id = storyboard["panels"][0]["id"]
    patch = client.patch(
        f"/api/panels/{panel_id}",
        headers=headers,
        json={"image_prompt": "new image prompt"},
    )
    assert patch.status_code == 200
    panel = patch.json()["data"]["panel"]
    assert panel["id"] == panel_id
    assert panel["image_prompt"] == "new image prompt"

    clear_patch = client.patch(
        f"/api/panels/{panel_id}",
        headers=headers,
        json={"image_prompt": None},
    )
    assert clear_patch.status_code == 200
    cleared_panel = clear_patch.json()["data"]["panel"]
    assert cleared_panel["image_prompt"] is None
