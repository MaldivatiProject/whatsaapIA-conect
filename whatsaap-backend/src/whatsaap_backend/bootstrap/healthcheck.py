"""Container health checks for API and worker processes."""

from __future__ import annotations

import asyncio
import sys
from urllib.error import URLError
from urllib.request import urlopen

from sqlalchemy import text

from whatsaap_backend.config import Settings, get_settings
from whatsaap_backend.infrastructure.messaging.rabbitmq import RabbitMQBus
from whatsaap_backend.infrastructure.persistence.database import create_engine


async def _check_database(settings: Settings) -> None:
    engine = create_engine(settings)
    try:
        async with engine.connect() as connection:
            await connection.execute(text("SELECT 1"))
    finally:
        await engine.dispose()


async def _check_rabbitmq(settings: Settings, queue_name: str | None = None) -> None:
    bus = RabbitMQBus(settings.RABBITMQ_URL, settings.RABBITMQ_PREFETCH)
    await bus.connect()
    try:
        if queue_name:
            await bus.queue(queue_name)
    finally:
        await bus.close()


def _check_api(settings: Settings) -> None:
    url = f"http://127.0.0.1:{settings.APP_PORT}/health/ready"
    try:
        with urlopen(url, timeout=3) as response:  # noqa: S310  # nosec B310
            if response.status >= 400:
                raise RuntimeError(f"API readiness returned HTTP {response.status}")
    except URLError as error:
        raise RuntimeError(f"API readiness failed: {error}") from error


async def _run(mode: str, queue_name: str | None) -> None:
    settings = get_settings()
    if mode == "api":
        _check_api(settings)
        return
    if mode == "db":
        await _check_database(settings)
        return
    if mode == "rabbit":
        await _check_rabbitmq(settings, queue_name)
        return
    if mode == "relay":
        await _check_database(settings)
        await _check_rabbitmq(settings)
        return
    raise ValueError(f"Unsupported healthcheck mode: {mode}")


def main() -> None:
    mode = sys.argv[1] if len(sys.argv) > 1 else ""
    queue_name = sys.argv[2] if len(sys.argv) > 2 else None
    try:
        asyncio.run(_run(mode, queue_name))
    except Exception as error:  # noqa: BLE001 - healthcheck must fail closed.
        print(str(error), file=sys.stderr)
        raise SystemExit(1) from error


if __name__ == "__main__":
    main()
