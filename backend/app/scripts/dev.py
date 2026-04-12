from __future__ import annotations

import argparse
import re
from pathlib import Path

import pymysql
import uvicorn
from alembic.config import Config
from sqlalchemy.engine import make_url

from alembic import command
from app.core.config import get_settings
from app.scripts.seed import main as seed_main

MYSQL_DATABASE_NAME_PATTERN = re.compile(r"^[A-Za-z0-9_]+$")


def parse_args() -> argparse.Namespace:
    settings = get_settings()
    parser = argparse.ArgumentParser(
        description="Run migrations, seed the default user, and start the director backend."
    )
    parser.add_argument("--host", default="0.0.0.0")
    parser.add_argument("--port", type=int, default=settings.director_backend_port)
    parser.add_argument("--no-reload", action="store_false", dest="reload")
    parser.set_defaults(reload=True)
    return parser.parse_args()


def ensure_database_exists() -> None:
    settings = get_settings()
    url = make_url(settings.database_url)

    if not url.drivername.startswith("mysql"):
        return

    database_name = url.database
    if not database_name:
        return
    if not MYSQL_DATABASE_NAME_PATTERN.fullmatch(database_name):
        raise ValueError("MySQL database name contains unsupported characters")

    connection = pymysql.connect(
        host=url.host or "127.0.0.1",
        port=url.port or 3306,
        user=url.username,
        password=url.password or "",
        charset="utf8mb4",
        autocommit=True,
    )
    try:
        with connection.cursor() as cursor:
            cursor.execute(
                "CREATE DATABASE IF NOT EXISTS "
                f"`{database_name}` "
                "CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"
            )
    finally:
        connection.close()


def run_migrations() -> None:
    backend_root = Path(__file__).resolve().parents[2]
    alembic_config = Config(str(backend_root / "alembic.ini"))
    alembic_config.set_main_option("script_location", str(backend_root / "alembic"))
    alembic_config.set_main_option("sqlalchemy.url", get_settings().database_url)
    command.upgrade(alembic_config, "head")


def main() -> None:
    args = parse_args()

    print("Ensuring database exists...")
    ensure_database_exists()

    print("Running migrations...")
    run_migrations()

    print("Seeding default user...")
    seed_main()

    print(f"Starting backend on http://{args.host}:{args.port} ...")
    uvicorn.run("app.main:app", host=args.host, port=args.port, reload=args.reload)


if __name__ == "__main__":
    main()
