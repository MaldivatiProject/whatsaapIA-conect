from __future__ import annotations

import json
from datetime import UTC, datetime
from unittest.mock import MagicMock

import pytest
from googleapiclient.errors import HttpError

from whatsaap_backend.infrastructure.integrations import google_drive_client as module
from whatsaap_backend.infrastructure.integrations.google_drive_client import (
    DriveAccessError,
    GoogleDriveDocumentClient,
)

_FAKE_CREDENTIALS_JSON = json.dumps({"type": "service_account", "client_email": "bot@x.iam"})


class _FakeResp:
    def __init__(self, status: int, reason: str = "") -> None:
        self.status = status
        self.reason = reason


class _FakeMediaIoBaseDownload:
    """Stands in for googleapiclient.http.MediaIoBaseDownload: writes fixed
    bytes to the buffer in a single chunk instead of hitting the network."""

    def __init__(self, buffer: object, request: object, chunksize: int = 0) -> None:
        self._buffer = buffer
        self._payload = getattr(request, "_fake_payload", b"hello from drive")

    def next_chunk(self) -> tuple[None, bool]:
        self._buffer.write(self._payload)  # type: ignore[attr-defined]
        return None, True


def _fake_service(*, mime_type: str, payload: bytes = b"hello from drive") -> MagicMock:
    service = MagicMock()
    get_request = MagicMock()
    get_request.execute.return_value = {
        "id": "file123",
        "name": "pricing.txt",
        "mimeType": mime_type,
        "modifiedTime": "2026-07-10T12:00:00Z",
    }
    service.files.return_value.get.return_value = get_request

    media_request = MagicMock()
    media_request._fake_payload = payload
    service.files.return_value.get_media.return_value = media_request
    service.files.return_value.export_media.return_value = media_request
    return service


@pytest.fixture(autouse=True)
def _patch_media_download(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(module, "MediaIoBaseDownload", _FakeMediaIoBaseDownload)


@pytest.fixture(autouse=True)
def _patch_credentials(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(
        module.service_account.Credentials,
        "from_service_account_info",
        classmethod(lambda cls, info, scopes=None: MagicMock()),
    )


async def test_read_file_returns_plain_text_content(monkeypatch: pytest.MonkeyPatch) -> None:
    service = _fake_service(mime_type="text/plain")
    monkeypatch.setattr(module, "build", lambda *args, **kwargs: service)

    client = GoogleDriveDocumentClient()
    content = await client.read_file(
        file_id="file123", service_account_json=_FAKE_CREDENTIALS_JSON, cache_ttl_seconds=0
    )

    assert content.file_id == "file123"
    assert content.name == "pricing.txt"
    assert content.mime_type == "text/plain"
    assert content.text == "hello from drive"
    assert content.modified_time == datetime(2026, 7, 10, 12, 0, tzinfo=UTC)
    service.files.return_value.get_media.assert_called_once()
    service.files.return_value.export_media.assert_not_called()


async def test_read_file_exports_google_workspace_document(monkeypatch: pytest.MonkeyPatch) -> None:
    service = _fake_service(mime_type="application/vnd.google-apps.document")
    monkeypatch.setattr(module, "build", lambda *args, **kwargs: service)

    client = GoogleDriveDocumentClient()
    content = await client.read_file(
        file_id="file123", service_account_json=_FAKE_CREDENTIALS_JSON, cache_ttl_seconds=0
    )

    assert content.mime_type == "text/plain"
    service.files.return_value.export_media.assert_called_once_with(
        fileId="file123", mimeType="text/plain"
    )
    service.files.return_value.get_media.assert_not_called()


async def test_read_file_caches_within_ttl(monkeypatch: pytest.MonkeyPatch) -> None:
    service = _fake_service(mime_type="text/plain")
    build_calls = 0

    def _build(*args: object, **kwargs: object) -> MagicMock:
        nonlocal build_calls
        build_calls += 1
        return service

    monkeypatch.setattr(module, "build", _build)

    client = GoogleDriveDocumentClient()
    first = await client.read_file(
        file_id="file123", service_account_json=_FAKE_CREDENTIALS_JSON, cache_ttl_seconds=60
    )
    second = await client.read_file(
        file_id="file123", service_account_json=_FAKE_CREDENTIALS_JSON, cache_ttl_seconds=60
    )

    assert first == second
    assert build_calls == 1


async def test_read_file_raises_on_invalid_json() -> None:
    client = GoogleDriveDocumentClient()
    with pytest.raises(DriveAccessError):
        await client.read_file(
            file_id="file123", service_account_json="not json", cache_ttl_seconds=0
        )


async def test_read_file_raises_drive_access_error_on_http_error(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service = MagicMock()
    error_content = json.dumps({"error": {"message": "File not found"}}).encode()
    service.files.return_value.get.return_value.execute.side_effect = HttpError(
        _FakeResp(404), error_content
    )
    monkeypatch.setattr(module, "build", lambda *args, **kwargs: service)

    client = GoogleDriveDocumentClient()
    with pytest.raises(DriveAccessError, match="File not found"):
        await client.read_file(
            file_id="file123", service_account_json=_FAKE_CREDENTIALS_JSON, cache_ttl_seconds=0
        )
