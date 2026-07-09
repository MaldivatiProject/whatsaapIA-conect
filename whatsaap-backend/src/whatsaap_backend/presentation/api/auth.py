"""x-api-key → tenant_id resolution, mirroring whatsapp-connector's ApiKeyAuthGuard
(API_KEYS format 'tenant:secret', same header name, same tenant-isolation intent)."""

from __future__ import annotations

import hmac

from fastapi import Header, Request

from whatsaap_backend.config import Settings

from .errors import ProblemDetailsError

API_KEY_HEADER = "x-api-key"


class UnauthorizedError(ProblemDetailsError):
    def __init__(self, detail: str = "Missing or invalid API key") -> None:
        super().__init__(401, "UnauthorizedError", detail)


def _authenticate(presented: str | None, api_key_map: dict[str, str]) -> str | None:
    if not presented:
        return None
    for secret, tenant_id in api_key_map.items():
        if hmac.compare_digest(secret, presented):
            return tenant_id
    return None


async def require_tenant(
    request: Request,
    x_api_key: str | None = Header(default=None, alias=API_KEY_HEADER),
) -> str:
    """FastAPI dependency: returns the authenticated tenant_id or raises 401."""
    settings: Settings = request.app.state.settings
    if not settings.AUTH_ENABLED:
        return "public"

    tenant_id = _authenticate(x_api_key, settings.api_key_map())
    if tenant_id is None:
        raise UnauthorizedError
    return tenant_id
