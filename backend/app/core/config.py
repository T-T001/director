from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(".env", ".env.example", "../.env", "../.env.example"),
        extra="ignore",
        case_sensitive=False,
    )

    app_name: str = "director"
    api_prefix: str = "/api"

    director_backend_port: int = 18000
    director_frontend_port: int = 15173
    director_cors_origins: str = "http://localhost:15173"
    director_access_token_expire_minutes: int = 120
    director_refresh_token_expire_days: int = 30
    director_jwt_secret: str = "change-me"
    director_refresh_cookie_name: str = "director_refresh_token"

    director_database_url: str = "mysql+pymysql://root:waoowaoo123@localhost:13306/director"
    director_redis_url: str = "redis://127.0.0.1:16379/0"
    director_minio_endpoint: str = "http://localhost:19000"
    director_minio_access_key: str = "minioadmin"
    director_minio_secret_key: str = "minioadmin"
    director_minio_bucket: str = "director"
    director_minio_region: str = "us-east-1"
    director_minio_secure: bool = False

    director_seed_username: str = "admin"
    director_seed_password: str = "admin123456"
    director_seed_email: str = "admin@example.com"

    @property
    def cors_origins(self) -> list[str]:
        return [item.strip() for item in self.director_cors_origins.split(",") if item.strip()]

    @property
    def database_url(self) -> str:
        return self.director_database_url

    @property
    def redis_url(self) -> str:
        return self.director_redis_url

    @property
    def minio_endpoint(self) -> str:
        return self.director_minio_endpoint

    @property
    def minio_access_key(self) -> str:
        return self.director_minio_access_key

    @property
    def minio_secret_key(self) -> str:
        return self.director_minio_secret_key

    @property
    def minio_bucket(self) -> str:
        return self.director_minio_bucket

    @property
    def minio_region(self) -> str:
        return self.director_minio_region

    @property
    def minio_secure(self) -> bool:
        return self.director_minio_secure

    @property
    def access_token_expire_minutes(self) -> int:
        return self.director_access_token_expire_minutes

    @property
    def refresh_token_expire_days(self) -> int:
        return self.director_refresh_token_expire_days

    @property
    def refresh_cookie_name(self) -> str:
        return self.director_refresh_cookie_name

    @property
    def refresh_cookie_secure(self) -> bool:
        return any(origin.startswith("https://") for origin in self.cors_origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()
