"""Problem Details (RFC 7807) error mapping — mirrors whatsapp-connector's
shared/filters so both services return a consistent error shape to clients."""

from __future__ import annotations

from collections.abc import Mapping, Sequence
from datetime import UTC, datetime
from typing import Any
from uuid import uuid4

import structlog
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from whatsaap_backend.domain.rule_engine import InvalidRuleError

logger = structlog.get_logger(__name__)

# Locations pydantic always prepends that mean nothing to whoever is reading
# the error in the dashboard (which HTTP part it came from) — never the
# useful part of the path, so always dropped.
_UNINFORMATIVE_LOC_SEGMENTS = {"body", "query", "path", "header", "cookie"}

# Real field names, but ones the dashboard never surfaces by that name (it
# just shows a single "Condición"/"Acción" per rule) — prefixing an already
# complete Spanish sentence with the raw English JSON field name reads as
# noise rather than context, so it's dropped rather than translated.
_OPAQUE_FIELD_NAMES = {"actions", "conditions"}


def _format_validation_errors(errors: Sequence[Mapping[str, Any]]) -> str:
    """Turns FastAPI/pydantic's raw error list into a readable message —
    the default `str(exc.errors())` dumps Python dict/tuple repr syntax
    (loc tuples, ctx with a nested exception object, a pydantic docs URL),
    which reads as noise rather than a usable error to someone editing a
    rule in the dashboard.
    """
    messages = []
    for error in errors:
        raw_loc = error.get("loc", ())
        loc = [str(part) for part in raw_loc if part not in _UNINFORMATIVE_LOC_SEGMENTS]
        # List indices (the "0" in "actions.0") don't mean anything to
        # someone editing a single rule/action in the dashboard.
        field_path = ".".join(part for part in loc if not part.isdigit())
        # Pydantic v2 prefixes every custom validator's raised ValueError
        # message with "Value error, " — redundant once shown as an error.
        msg = str(error.get("msg", "")).removeprefix("Value error, ")
        # Only drop an opaque field name for "value_error" (a raised
        # ValueError from one of this codebase's own validators) — by
        # convention those messages are already complete sentences that
        # don't need field context. Built-in pydantic constraint messages
        # (e.g. "List should have at least 1 item...") don't repeat the
        # field name themselves, so the prefix is the only way to know
        # *which* field that refers to and must stay.
        drop_prefix = error.get("type") == "value_error" and (
            not field_path or field_path in _OPAQUE_FIELD_NAMES
        )
        if drop_prefix or not field_path:
            messages.append(msg)
        else:
            messages.append(f"{field_path}: {msg}")
    return "; ".join(messages) or "Solicitud inválida"


class ProblemDetailsError(Exception):
    """Raise to produce a specific Problem Details response."""

    def __init__(self, status_code: int, title: str, detail: str) -> None:
        super().__init__(detail)
        self.status_code = status_code
        self.title = title
        self.detail = detail


class RuleNotFoundError(ProblemDetailsError):
    def __init__(self, rule_id: str) -> None:
        super().__init__(
            status.HTTP_404_NOT_FOUND, "RuleNotFoundError", f"Rule '{rule_id}' not found"
        )


class ContactIdentityNotFoundError(ProblemDetailsError):
    def __init__(self, identity_id: str) -> None:
        super().__init__(
            status.HTTP_404_NOT_FOUND,
            "ContactIdentityNotFoundError",
            f"Contact identity '{identity_id}' not found",
        )


class SecretNotFoundError(ProblemDetailsError):
    def __init__(self, name: str) -> None:
        super().__init__(
            status.HTTP_404_NOT_FOUND, "SecretNotFoundError", f"Secret '{name}' not found"
        )


class SecretAlreadyExistsError(ProblemDetailsError):
    def __init__(self, name: str) -> None:
        super().__init__(
            status.HTTP_409_CONFLICT,
            "SecretAlreadyExistsError",
            f"Secret '{name}' already exists for this tenant",
        )


class DriveIntegrationNotConfiguredError(ProblemDetailsError):
    def __init__(self) -> None:
        super().__init__(
            status.HTTP_404_NOT_FOUND,
            "DriveIntegrationNotConfiguredError",
            "No Google Drive integration is configured for this tenant",
        )


class DriveCredentialsMissingError(ProblemDetailsError):
    def __init__(self, secret_name: str) -> None:
        super().__init__(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "DriveCredentialsMissingError",
            f"No secret named '{secret_name}' is stored for this tenant; "
            "set the service-account credential via POST /api/v1/secrets first",
        )


def _problem_response(request: Request, status_code: int, title: str, detail: str) -> JSONResponse:
    correlation_id = getattr(request.state, "correlation_id", None) or str(uuid4())
    body = {
        "type": f"https://whatsaap-backend/errors/{title.lower()}",
        "title": title,
        "status": status_code,
        "detail": detail,
        "correlationId": correlation_id,
        "timestamp": datetime.now(UTC).isoformat(),
    }
    return JSONResponse(status_code=status_code, content=jsonable_encoder(body))


def register_exception_handlers(app: FastAPI) -> None:
    @app.exception_handler(ProblemDetailsError)
    async def _problem_details_handler(request: Request, exc: ProblemDetailsError) -> JSONResponse:
        return _problem_response(request, exc.status_code, exc.title, exc.detail)

    @app.exception_handler(InvalidRuleError)
    async def _invalid_rule_handler(request: Request, exc: InvalidRuleError) -> JSONResponse:
        return _problem_response(
            request, status.HTTP_422_UNPROCESSABLE_ENTITY, "InvalidRuleError", str(exc)
        )

    @app.exception_handler(RequestValidationError)
    async def _validation_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
        return _problem_response(
            request,
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "ValidationError",
            _format_validation_errors(exc.errors()),
        )

    @app.exception_handler(StarletteHTTPException)
    async def _http_exception_handler(
        request: Request, exc: StarletteHTTPException
    ) -> JSONResponse:
        return _problem_response(request, exc.status_code, "HttpError", str(exc.detail))

    @app.exception_handler(Exception)
    async def _unexpected_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.error("unhandled_exception", error=str(exc), path=request.url.path)
        return _problem_response(
            request,
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            "InternalServerError",
            "Unexpected error",
        )
