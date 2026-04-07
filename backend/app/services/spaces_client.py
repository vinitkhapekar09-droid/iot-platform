import json
from typing import Optional

import boto3
from botocore.exceptions import ClientError

from app.config import settings


class SpacesClient:
    def __init__(self):
        self.bucket = settings.do_spaces_bucket
        self.enabled = all(
            [
                settings.do_spaces_region,
                settings.do_spaces_bucket,
                settings.do_spaces_endpoint,
                settings.do_spaces_access_key,
                settings.do_spaces_secret_key,
            ]
        )
        self.client = None
        if self.enabled:
            self.client = boto3.client(
                "s3",
                region_name=settings.do_spaces_region,
                endpoint_url=settings.do_spaces_endpoint,
                aws_access_key_id=settings.do_spaces_access_key,
                aws_secret_access_key=settings.do_spaces_secret_key,
            )

    def upload_bytes(self, key: str, payload: bytes, content_type: str) -> None:
        if not self.enabled or self.client is None:
            raise RuntimeError("DigitalOcean Spaces is not configured")
        self.client.put_object(
            Bucket=self.bucket,
            Key=key,
            Body=payload,
            ContentType=content_type,
        )

    def upload_json(self, key: str, payload: dict) -> None:
        self.upload_bytes(
            key=key,
            payload=json.dumps(payload, indent=2).encode("utf-8"),
            content_type="application/json",
        )

    def get_json(self, key: str) -> Optional[dict]:
        if not self.enabled or self.client is None:
            return None
        try:
            obj = self.client.get_object(Bucket=self.bucket, Key=key)
            return json.loads(obj["Body"].read().decode("utf-8"))
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            if code in {"NoSuchKey", "404"}:
                return None
            raise

    def download_bytes(self, key: str) -> Optional[bytes]:
        if not self.enabled or self.client is None:
            return None
        try:
            obj = self.client.get_object(Bucket=self.bucket, Key=key)
            return obj["Body"].read()
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code")
            if code in {"NoSuchKey", "404"}:
                return None
            raise
