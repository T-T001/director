from fastapi.testclient import TestClient
from sqlalchemy.orm import configure_mappers

import app.main as main


def test_healthcheck(monkeypatch) -> None:
    monkeypatch.setattr(main, "ensure_bucket_exists", lambda: None)
    with TestClient(main.app) as client:
        response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_login_preflight_allows_localhost_dev_origin(monkeypatch) -> None:
    monkeypatch.setattr(main, "ensure_bucket_exists", lambda: None)
    with TestClient(main.app) as client:
        response = client.options(
            "/api/auth/login",
            headers={
                "Origin": "http://localhost:15174",
                "Access-Control-Request-Method": "POST",
                "Access-Control-Request-Headers": "content-type",
            },
        )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:15174"
    assert response.headers["access-control-allow-credentials"] == "true"


def test_mappers_configure_successfully() -> None:
    configure_mappers()
