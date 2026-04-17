from __future__ import annotations

from collections.abc import Generator
from io import BytesIO

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session, sessionmaker
from sqlalchemy.pool import StaticPool

import app.api.routes.assets as assets_route
import app.core.db as core_db
import app.main as main
import app.services.asset_service as asset_service_module
from app.core.db import Base, get_db
from app.core.security import hash_password
from app.db.models.episode import Episode
from app.db.models.project import Project
from app.db.models.user import User
from app.services import prompt_workflow_service, script_to_storyboard_service, video_workflow_service
from app.services import task_service as task_service_module
from app.services import voice_workflow_service


class FakeS3Client:
    def __init__(self) -> None:
        self.objects: dict[tuple[str, str], bytes] = {}

    def upload_fileobj(self, fileobj, bucket: str, key: str, ExtraArgs=None) -> None:  # noqa: N803
        self.objects[(bucket, key)] = fileobj.read()

    def get_object(self, Bucket: str, Key: str) -> dict:  # noqa: N803
        return {"Body": BytesIO(self.objects[(Bucket, Key)])}


def _install_workflow_runner_patches(monkeypatch, testing_session_local: sessionmaker) -> None:
    monkeypatch.setattr(script_to_storyboard_service, "SessionLocal", testing_session_local)
    monkeypatch.setattr(prompt_workflow_service, "SessionLocal", testing_session_local)
    monkeypatch.setattr(voice_workflow_service, "SessionLocal", testing_session_local)
    monkeypatch.setattr(video_workflow_service, "SessionLocal", testing_session_local)
    monkeypatch.setattr(task_service_module, "run_script_to_storyboard_task", script_to_storyboard_service.run_script_to_storyboard_task)
    monkeypatch.setattr(task_service_module, "run_prompt_modify_task", prompt_workflow_service.run_prompt_modify_task)
    monkeypatch.setattr(task_service_module, "run_prompt_source_append_task", prompt_workflow_service.run_prompt_source_append_task)
    monkeypatch.setattr(task_service_module, "run_voice_generate_task", voice_workflow_service.run_voice_generate_task)
    monkeypatch.setattr(task_service_module, "run_video_generate_task", video_workflow_service.run_video_generate_task)
    monkeypatch.setattr(task_service_module, "run_video_lipsync_task", video_workflow_service.run_video_lipsync_task)


def _install_fake_media_storage(monkeypatch, fake_s3_client: FakeS3Client) -> None:
    monkeypatch.setattr(asset_service_module, "get_s3_client", lambda: fake_s3_client)
    monkeypatch.setattr(assets_route, "get_s3_client", lambda: fake_s3_client)


def _seed_user_project_episode(db_factory: sessionmaker) -> tuple[str, str, str]:
    db = db_factory()
    try:
        user = User(username="task_user", password_hash=hash_password("pass123456"))
        db.add(user)
        db.flush()

        project = Project(user_id=user.id, name="Task Project")
        db.add(project)
        db.flush()

        episode = Episode(
            project_id=project.id,
            episode_number=1,
            name="EP1",
            novel_text="A hero enters the city. She looks around. The harbor wakes up.",
            srt_content="1\n00:00:00,000 --> 00:00:02,000\nNarrator: A hero enters the city.\n\n2\n00:00:02,000 --> 00:00:04,000\nHero: We finally made it.",
        )
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


def _create_storyboard_panel(client: TestClient, headers: dict[str, str], episode_id: str) -> tuple[str, str]:
    submit = client.post(
        f"/api/episodes/{episode_id}/script-to-storyboard",
        headers=headers,
        json={"script": "A hero enters. She looks around. The city wakes up."},
    )
    assert submit.status_code == 200

    boards = client.get(f"/api/episodes/{episode_id}/storyboards", headers=headers)
    assert boards.status_code == 200
    storyboard = boards.json()["data"]["storyboards"][0]
    panel_id = storyboard["panels"][0]["id"]
    return storyboard["id"], panel_id


def _get_storyboard_detail(client: TestClient, headers: dict[str, str], storyboard_id: str) -> dict:
    response = client.get(f"/api/storyboards/{storyboard_id}", headers=headers)
    assert response.status_code == 200
    return response.json()["data"]["storyboard"]


def _get_episode_detail(client: TestClient, headers: dict[str, str], episode_id: str) -> dict:
    response = client.get(f"/api/episodes/{episode_id}", headers=headers)
    assert response.status_code == 200
    return response.json()["data"]["episode"]


def _get_task_detail(client: TestClient, headers: dict[str, str], task_id: str) -> dict:
    response = client.get(f"/api/tasks/{task_id}", headers=headers)
    assert response.status_code == 200
    return response.json()["data"]["task"]


def _assert_media_response(client: TestClient, headers: dict[str, str], media_id: str, content_type_prefix: str) -> None:
    response = client.get(f"/api/media/{media_id}", headers=headers)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith(content_type_prefix)
    assert len(response.content) > 0


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

    fake_s3_client = FakeS3Client()
    main.app.dependency_overrides[get_db] = override_get_db
    monkeypatch.setattr(core_db, "SessionLocal", testing_session_local)
    _install_workflow_runner_patches(monkeypatch, testing_session_local)
    _install_fake_media_storage(monkeypatch, fake_s3_client)

    with TestClient(main.app) as client:
        yield client, testing_session_local

    main.app.dependency_overrides.clear()
    Base.metadata.drop_all(bind=engine)


def test_prompt_modify_panel_workflow_updates_panel(client_and_db) -> None:
    client, db_factory = client_and_db
    _user_id, _project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)
    storyboard_id, panel_id = _create_storyboard_panel(client, headers, episode_id)

    submit = client.post(
        f"/api/panels/{panel_id}/prompt-modify",
        headers=headers,
        json={
            "prompt": "Cinematic dockside shot",
            "instruction": "Make the framing tighter and emphasize sunrise fog.",
            "mentioned_characters": ["Hero"],
            "mentioned_locations": ["Harbor"],
        },
    )
    assert submit.status_code == 200
    payload = submit.json()["data"]
    assert payload["deduped"] is False

    task = _get_task_detail(client, headers, payload["task_id"])
    assert task["task_type"] == "prompt_modify_run"
    assert task["target_type"] == "panel"
    assert task["target_id"] == panel_id
    assert task["status"] == "completed"

    storyboard = _get_storyboard_detail(client, headers, storyboard_id)
    panel = next(item for item in storyboard["panels"] if item["id"] == panel_id)
    assert "Refinement: Make the framing tighter and emphasize sunrise fog." in panel["image_prompt"]
    assert "Characters: Hero" in panel["image_prompt"]
    assert "Locations: Harbor" in panel["image_prompt"]


def test_prompt_source_append_updates_storyboard_panels(client_and_db) -> None:
    client, db_factory = client_and_db
    _user_id, _project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)
    storyboard_id, _panel_id = _create_storyboard_panel(client, headers, episode_id)

    submit = client.post(
        f"/api/episodes/{episode_id}/prompt-source",
        headers=headers,
        json={"content": "Add harbor fog. Add reflective water. Add warm dawn light."},
    )
    assert submit.status_code == 200
    payload = submit.json()["data"]
    assert payload["deduped"] is False

    task = _get_task_detail(client, headers, payload["task_id"])
    assert task["task_type"] == "prompt_source_append_run"
    assert task["target_type"] == "episode"
    assert task["status"] == "completed"
    assert task["result_json"]["updated_count"] >= 1

    storyboard = _get_storyboard_detail(client, headers, storyboard_id)
    assert any("Source addendum:" in (panel["image_prompt"] or "") for panel in storyboard["panels"])


def test_panel_video_generate_dedupe_via_tasks_api(client_and_db, monkeypatch) -> None:
    client, db_factory = client_and_db
    _user_id, project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)
    _storyboard_id, panel_id = _create_storyboard_panel(client, headers, episode_id)

    monkeypatch.setattr(task_service_module, "run_video_generate_task", lambda _task_id: None)

    first = client.post(
        f"/api/panels/{panel_id}/video-generate",
        headers=headers,
        json={"prompt": "Cinematic harbor tracking shot"},
    )
    assert first.status_code == 200
    first_data = first.json()["data"]

    second = client.post(
        "/api/tasks",
        headers=headers,
        json={
            "project_id": project_id,
            "task_type": "video_generate_run",
            "target_type": "panel",
            "target_id": panel_id,
            "payload_json": {"prompt": "Second prompt"},
        },
    )
    assert second.status_code == 200
    second_data = second.json()["data"]

    assert second_data["deduped"] is True
    assert second_data["task_id"] == first_data["task_id"]


def test_voice_generate_updates_episode_audio_and_media_route(client_and_db) -> None:
    client, db_factory = client_and_db
    _user_id, _project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)

    submit = client.post(
        f"/api/episodes/{episode_id}/voice-generate",
        headers=headers,
        json={"line_text": "Hero: We finally made it."},
    )
    assert submit.status_code == 200
    payload = submit.json()["data"]

    task = _get_task_detail(client, headers, payload["task_id"])
    assert task["task_type"] == "voice_generate_run"
    assert task["target_type"] == "episode"
    assert task["target_id"] == episode_id
    assert task["status"] == "completed"
    assert task["result_json"]["audio_media_id"]
    assert task["result_json"]["audio_url"].startswith("/api/media/")

    episode = _get_episode_detail(client, headers, episode_id)
    assert episode["audio_media_id"] == task["result_json"]["audio_media_id"]
    _assert_media_response(client, headers, episode["audio_media_id"], "audio/wav")


def test_video_generate_and_lipsync_update_panel_media(client_and_db) -> None:
    client, db_factory = client_and_db
    _user_id, _project_id, episode_id = _seed_user_project_episode(db_factory)
    headers = _login_headers(client)
    storyboard_id, panel_id = _create_storyboard_panel(client, headers, episode_id)

    generate = client.post(
        f"/api/panels/{panel_id}/video-generate",
        headers=headers,
        json={"prompt": "Cinematic harbor tracking shot"},
    )
    assert generate.status_code == 200
    generate_task = _get_task_detail(client, headers, generate.json()["data"]["task_id"])
    assert generate_task["task_type"] == "video_generate_run"
    assert generate_task["status"] == "completed"
    first_video_media_id = generate_task["result_json"]["panel"]["video_media_id"]
    _assert_media_response(client, headers, first_video_media_id, "video/mp4")

    voice = client.post(
        f"/api/episodes/{episode_id}/voice-generate",
        headers=headers,
        json={"line_text": "Hero: We finally made it."},
    )
    assert voice.status_code == 200
    voice_task = _get_task_detail(client, headers, voice.json()["data"]["task_id"])
    audio_media_id = voice_task["result_json"]["audio_media_id"]

    lipsync = client.post(
        f"/api/panels/{panel_id}/video-lipsync",
        headers=headers,
        json={"prompt": "Lip sync harbor close-up", "audio_media_id": audio_media_id},
    )
    assert lipsync.status_code == 200
    lipsync_task = _get_task_detail(client, headers, lipsync.json()["data"]["task_id"])
    assert lipsync_task["task_type"] == "video_lipsync_run"
    assert lipsync_task["status"] == "completed"
    second_video_media_id = lipsync_task["result_json"]["panel"]["video_media_id"]
    assert second_video_media_id != first_video_media_id
    _assert_media_response(client, headers, second_video_media_id, "video/mp4")

    storyboard = _get_storyboard_detail(client, headers, storyboard_id)
    panel = next(item for item in storyboard["panels"] if item["id"] == panel_id)
    assert panel["video_media_id"] == second_video_media_id
