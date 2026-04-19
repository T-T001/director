"""S3/MinIO helpers. Uses boto3 against the bucket configured in settings."""

from __future__ import annotations

from typing import BinaryIO, Iterable

import boto3
from botocore.exceptions import ClientError

from app.core.config import get_settings

settings = get_settings()


def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.minio_endpoint,
        aws_access_key_id=settings.minio_access_key,
        aws_secret_access_key=settings.minio_secret_key,
        region_name=settings.minio_region,
        use_ssl=settings.minio_secure,
    )


def ensure_bucket_exists() -> None:
    client = get_s3_client()
    try:
        client.head_bucket(Bucket=settings.minio_bucket)
    except ClientError:
        client.create_bucket(Bucket=settings.minio_bucket)


def upload_bytes(key: str, data: bytes, *, content_type: str = "application/octet-stream") -> None:
    get_s3_client().put_object(
        Bucket=settings.minio_bucket, Key=key, Body=data, ContentType=content_type
    )


def upload_fileobj(key: str, fileobj: BinaryIO, *, content_type: str = "application/octet-stream") -> None:
    get_s3_client().upload_fileobj(
        fileobj,
        settings.minio_bucket,
        key,
        ExtraArgs={"ContentType": content_type},
    )


def download_bytes(key: str) -> bytes:
    resp = get_s3_client().get_object(Bucket=settings.minio_bucket, Key=key)
    return resp["Body"].read()


def stream_object(key: str, chunk_size: int = 1024 * 64) -> Iterable[bytes]:
    resp = get_s3_client().get_object(Bucket=settings.minio_bucket, Key=key)
    body = resp["Body"]
    try:
        while True:
            chunk = body.read(chunk_size)
            if not chunk:
                return
            yield chunk
    finally:
        body.close()


def presign_get(key: str, *, ttl_seconds: int = 900) -> str:
    return get_s3_client().generate_presigned_url(
        "get_object",
        Params={"Bucket": settings.minio_bucket, "Key": key},
        ExpiresIn=ttl_seconds,
    )


def delete_object(key: str) -> None:
    try:
        get_s3_client().delete_object(Bucket=settings.minio_bucket, Key=key)
    except ClientError:
        pass


def head_object(key: str) -> dict | None:
    try:
        return get_s3_client().head_object(Bucket=settings.minio_bucket, Key=key)
    except ClientError:
        return None
