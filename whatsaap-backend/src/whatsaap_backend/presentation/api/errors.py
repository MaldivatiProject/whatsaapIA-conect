"""Problem Details (RFC 7807) error mapping — mirrors whatsapp-connector's
shared/filters so both services return a consistent error shape to clients."""

from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

import structlog
from fastapi import FastAPI, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from whatsaap_backend.domain.rule_engine import InvalidRuleError

logger = structlog.get_logger(__name__)


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
            request, status.HTTP_422_UNPROCESSABLE_ENTITY, "ValidationError", str(exc.errors())
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
