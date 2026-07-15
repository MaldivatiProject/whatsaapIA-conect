"""Google Drive adapter: reads a single file's text content using a
tenant-supplied service-account credential (no OAuth user consent flow —
the file is shared with the service account's own email, see docs). Stays
within the Drive API's free tier for the single-file polling use case this
backend needs: no per-request cost, generous default quota."""

from __future__ import annotations

import asyncio
import hashlib
import io
import json
import time
from datetime import datetime

import structlog
from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload

from whatsaap_backend.application.contracts import DriveFileContent

logger = structlog.get_logger(__name__)

_SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

# Google Workspace files (Docs/Sheets/Slides) have no raw byte content —
# they must be exported to a concrete mime type instead of downloaded.
_WORKSPACE_EXPORT_MIME_TYPES = {
    "application/vnd.google-apps.document": "text/plain",
    "application/vnd.google-apps.spreadsheet": "text/csv",
    "application/vnd.google-apps.presentation": "text/plain",
}


class DriveAccessError(RuntimeError):
    """Raised when the file can't be read: bad credentials, file not shared
    with the service account, file deleted, etc. Callers must treat this as
    an ordinary failure (e.g. surface it in a "test connection" response),
    not retry blindly."""

    def __init__(self, file_id: str, detail: str) -> None:
        super().__init__(f"drive file '{file_id}' inaccessible: {detail}")
        self.file_id = file_id
        self.detail = detail


class _CacheEntry:
    __slots__ = ("content", "expires_at")

    def __init__(self, content: DriveFileContent, expires_at: float) -> None:
        self.content = content
        self.expires_at = expires_at


def _cache_key(file_id: str, service_account_json: str) -> str:
    # Namespaced by a credential fingerprint (not the file_id alone) so two
    # tenants that happen to reference the same file_id under different
    # service accounts never share a cache entry.
    fingerprint = hashlib.sha256(service_account_json.encode()).hexdigest()[:16]
    return f"{fingerprint}:{file_id}"


class GoogleDriveDocumentClient:
    """Implements DriveDocumentPort. google-api-python-client is a
    synchronous/blocking library (no native asyncio support), so each read
    runs in a worker thread via asyncio.to_thread. A small in-process cache
    keyed by (credential fingerprint, file_id) avoids re-hitting the Drive
    API for every rule evaluation — this is a latency/quota optimization,
    not a correctness requirement, since Drive API calls themselves are
    free within normal usage."""

    def __init__(self) -> None:
        self._cache: dict[str, _CacheEntry] = {}
        self._lock = asyncio.Lock()

    async def read_file(
        self, *, file_id: str, service_account_json: str, cache_ttl_seconds: int
    ) -> DriveFileContent:
        key = _cache_key(file_id, service_account_json)

        if cache_ttl_seconds > 0:
            async with self._lock:
                cached = self._cache.get(key)
                if cached is not None and cached.expires_at > time.monotonic():
                    return cached.content

        content = await asyncio.to_thread(self._read_file_sync, file_id, service_account_json)

        if cache_ttl_seconds > 0:
            async with self._lock:
                self._cache[key] = _CacheEntry(content, time.monotonic() + cache_ttl_seconds)
        return content

    def _read_file_sync(self, file_id: str, service_account_json: str) -> DriveFileContent:
        try:
            account_info = json.loads(service_account_json)
        except ValueError as error:
            raise DriveAccessError(file_id, "invalid service-account JSON") from error

        try:
            credentials = service_account.Credentials.from_service_account_info(  # type: ignore[no-untyped-call]
                account_info, scopes=_SCOPES
            )
            service = build("drive", "v3", credentials=credentials, cache_discovery=False)

            metadata = (
                service.files()
                .get(
                    fileId=file_id,
                    fields="id,name,mimeType,modifiedTime",
                    supportsAllDrives=True,
                )
                .execute()
            )
            mime_type = str(metadata["mimeType"])
            export_mime_type = _WORKSPACE_EXPORT_MIME_TYPES.get(mime_type)
            request = (
                service.files().export_media(fileId=file_id, mimeType=export_mime_type)
                if export_mime_type
                else service.files().get_media(fileId=file_id, supportsAllDrives=True)
            )

            buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(buffer, request)
            done = False
            while not done:
                _, done = downloader.next_chunk()
        except HttpError as error:
            logger.warning("drive_file_access_error", file_id=file_id, status=error.status_code)
            raise DriveAccessError(
                file_id, f"Drive API error {error.status_code}: {error.reason}"
            ) from error
        except (ValueError, KeyError) as error:
            raise DriveAccessError(
                file_id, f"malformed credentials or response: {error}"
            ) from error

        modified_time = str(metadata["modifiedTime"]).replace("Z", "+00:00")
        return DriveFileContent(
            file_id=str(metadata["id"]),
            name=str(metadata["name"]),
            mime_type=export_mime_type or mime_type,
            modified_time=datetime.fromisoformat(modified_time),
            text=buffer.getvalue().decode("utf-8", errors="replace"),
        )
