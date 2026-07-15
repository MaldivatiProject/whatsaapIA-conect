"""Composition root for the `api` process: rules CRUD + connector webhook."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import structlog
import uvicorn
from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware

from whatsaap_backend.application.direct_delivery_service import ProcessIncomingMessageDirectService
from whatsaap_backend.application.services import IngestWebhookService
from whatsaap_backend.config import Settings, get_settings
from whatsaap_backend.infrastructure.integrations.connector_client import HttpConnectorMessageSender
from whatsaap_backend.infrastructure.persistence.database import (
    create_engine,
    create_session_factory,
)
from whatsaap_backend.infrastructure.persistence.uow import SqlAlchemyUnitOfWorkFactory
from whatsaap_backend.infrastructure.sandbox.subprocess_script_sandbox import (
    SubprocessScriptSandbox,
)
from whatsaap_backend.presentation.api.business_messages_router import (
    router as business_messages_router,
)
from whatsaap_backend.presentation.api.contact_identities_router import (
    router as contact_identities_router,
)
from whatsaap_backend.presentation.api.errors import register_exception_handlers
from whatsaap_backend.presentation.api.executions_router import router as executions_router
from whatsaap_backend.presentation.api.health_router import router as health_router
from whatsaap_backend.presentation.api.overview_router import router as overview_router
from whatsaap_backend.presentation.api.reports_router import router as reports_router
from whatsaap_backend.presentation.api.rules_router import router as rules_router
from whatsaap_backend.presentation.api.secrets_router import router as secrets_router
from whatsaap_backend.presentation.api.webhook_router import router as webhook_router

logger = structlog.get_logger(__name__)


def _configure_logging(settings: Settings) -> None:
    logging.basicConfig(level=settings.LOG_LEVEL, format="%(message)s")
    structlog.configure(
        processors=[
            structlog.processors.TimeStamper(fmt="iso"),
            structlog.processors.add_log_level,
            structlog.processors.JSONRenderer(),
        ],
        wrapper_class=structlog.make_filtering_bound_logger(
            logging.getLevelName(settings.LOG_LEVEL)
        ),
    )


@asynccontextmanager
async def _lifespan(app: FastAPI) -> AsyncIterator[None]:
    script_sandbox: SubprocessScriptSandbox = app.state.script_sandbox
    verified = await script_sandbox.verify()
    logger.info("script_sandbox_verified", verified=verified)

    yield

    sender: HttpConnectorMessageSender = app.state.message_sender
    await sender.aclose()
    await app.state.engine.dispose()


def create_app(settings: Settings | None = None) -> FastAPI:
    settings = settings or get_settings()
    _configure_logging(settings)

    app = FastAPI(title="whatsaap-backend", version="0.1.0", lifespan=_lifespan)

    engine = create_engine(settings)
    session_factory = create_session_factory(engine)
    uow_factory = SqlAlchemyUnitOfWorkFactory(session_factory, settings.SECRETS_ENCRYPTION_KEY)
    message_sender = HttpConnectorMessageSender(
        base_url=settings.CONNECTOR_BASE_URL,
        api_key=settings.CONNECTOR_API_KEY,
        timeout_seconds=settings.CONNECTOR_TIMEOUT_SECONDS,
    )
    script_sandbox = SubprocessScriptSandbox(settings)
    direct_delivery_service = ProcessIncomingMessageDirectService(
        uow_factory, message_sender, script_sandbox=script_sandbox
    )
    webhook_ingest_service = IngestWebhookService(uow_factory)

    app.state.settings = settings
    app.state.engine = engine
    app.state.uow_factory = uow_factory
    app.state.message_sender = message_sender
    app.state.script_sandbox = script_sandbox
    app.state.direct_delivery_service = direct_delivery_service
    app.state.webhook_ingest_service = webhook_ingest_service

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins_list(),
        allow_methods=["GET", "POST", "PATCH", "DELETE"],
        allow_headers=["x-api-key", "x-webhook-signature", "Content-Type"],
    )

    register_exception_handlers(app)
    app.include_router(health_router)
    app.include_router(contact_identities_router)
    app.include_router(rules_router)
    app.include_router(secrets_router)
    app.include_router(executions_router)
    app.include_router(overview_router)
    app.include_router(reports_router)
    app.include_router(business_messages_router)
    app.include_router(webhook_router)

    return app


app = create_app()


def main() -> None:
    settings = get_settings()
    # http="h11" (pure-Python, strict RFC 7230) instead of the httptools default:
    # httptools omits the `Connection` header on responses when the client
    # doesn't send one, which some intermediary proxies/tunnels mishandle,
    # closing the connection before relaying the body (seen as an empty
    # response through VSCode's forwarded ports, even though direct curl works).
    uvicorn.run(app, host=settings.APP_HOST, port=settings.APP_PORT, log_config=None, http="h11")


if __name__ == "__main__":
    main()
