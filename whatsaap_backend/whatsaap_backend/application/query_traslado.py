"""Formats replies for the QUERY_TRASLADO_STATUS action ("CONSULTAR TRASLADO
TIENDA"). Reads recent traslado_tienda BusinessMessage rows already written by
the "Traslado de tienda" RUN_SCRIPT (single-row or bulk) — no re-scraping,
just a lookup over what that rule already recorded.
"""

from __future__ import annotations

from collections.abc import Sequence
from datetime import datetime
from typing import Any
from zoneinfo import ZoneInfo

from whatsaap_backend.domain.models import BusinessMessage

DEFAULT_QUERY_BUSINESS_CATEGORY = "traslado_tienda"

# How many of the most recent attempts for a correo to pull before deciding
# what to show — generous enough to look past a handful of failed retries
# without scanning a person's entire traslado history.
RECENT_ATTEMPTS_LIMIT = 20

# The metadata key _run_script_action/_run_bulk_traslado_action (services.py,
# direct_delivery_service.py) stamp with the original message's timestamp, so
# a later query can report "solicitado" separately from "realizado" (received_at
# on the BusinessMessage row itself — set when the script's result was persisted).
SOLICITADO_AT_METADATA_KEY = "solicitado_at"

# Every phone number and admin panel this platform talks to is Colombian —
# render both timestamps in local time rather than the UTC they're stored in.
_DISPLAY_TZ = ZoneInfo("America/Bogota")


def _format_datetime(value: datetime) -> str:
    return value.astimezone(_DISPLAY_TZ).strftime("%d/%m/%Y %H:%M")


# Mirrors the ESTADO_LABELS mapping inside the "Traslado de tienda" RUN_SCRIPT
# source, so a query reply reads consistently with the original confirmation
# message — kept as its own copy since that mapping lives inside a
# rule-authored script string, not shared application code.
_ESTADO_LABELS: dict[str, str] = {
    "GUARDADO": "Completado",
    "YA_CORRECTA": "Completado",
    "NO_ENCONTRADO": "Error",
    "TIENDA_NO_ENCONTRADA": "Error",
    "ERROR_GUARDADO": "Error",
    "ERROR": "Error",
    "SIN_EMAIL": "Error",
}

_SUCCESS_RESULTADOS = {"GUARDADO", "YA_CORRECTA"}

# Short, human-readable reason shown in the "hubo intentos fallidos" warning —
# distinct from _ESTADO_LABELS, which only needs a binary Completado/Error.
_RESULTADO_DETAIL_LABELS: dict[str, str] = {
    "NO_ENCONTRADO": "no se encontró ningún vendedor con ese correo",
    "TIENDA_NO_ENCONTRADA": "tienda no encontrada",
    "ERROR_GUARDADO": "error guardando el traslado",
    "ERROR": "error procesando el traslado",
    "SIN_EMAIL": "no se pudo leer el correo",
}


def _resultado(record: BusinessMessage) -> str:
    return str(record.metadata.get("resultado", ""))


def _format_record(record: BusinessMessage, correo: str, *, note_last_success: bool) -> str:
    metadata: dict[str, Any] = record.metadata
    estado = _ESTADO_LABELS.get(_resultado(record), "Desconocido")
    if note_last_success:
        estado = f"{estado} (último éxito registrado)"

    solicitado_raw = metadata.get(SOLICITADO_AT_METADATA_KEY)
    solicitado_at = (
        _format_datetime(datetime.fromisoformat(str(solicitado_raw))) if solicitado_raw else "—"
    )
    realizado_at = _format_datetime(record.received_at)

    return (
        "CONSULTA TRASLADO TIENDA\n"
        f"Estado: {estado}\n"
        f"Nombre Completo: {metadata.get('NOMBRE_COMPLETO', '')}\n"
        f"CORREO: {metadata.get('CORREO', correo)}\n"
        f"Nueva tienda: {metadata.get('NUEVA_TIENDA', '')}\n"
        f"Fecha de solicitud: {solicitado_at}\n"
        f"Fecha de traslado: {realizado_at}"
    )


def build_traslado_query_reply(records: Sequence[BusinessMessage], correo: str) -> str:
    """`records` must be ordered most-recent-first (see
    BusinessMessageRepository.find_recent_by_correo).

    A retried traslado can leave a failed attempt (e.g. "tienda no
    encontrada") as the newest row even though an earlier attempt already
    succeeded and nothing about the person's actual store assignment changed.
    Showing that failure as "the" status would be misleading, so this reports
    the last successful attempt as the real state and separately calls out
    any failed retries that came after it — rather than silently hiding them
    or letting them mask a real success.
    """
    if not records:
        return f"No encontramos ningún traslado registrado para el correo {correo}."

    last_success = next((r for r in records if _resultado(r) in _SUCCESS_RESULTADOS), None)

    if last_success is None:
        # Every attempt on record failed — nothing to fall back to, just show
        # the latest one as-is.
        return _format_record(records[0], correo, note_last_success=False)

    failures_after = [
        r
        for r in records
        if r.received_at > last_success.received_at and _resultado(r) not in _SUCCESS_RESULTADOS
    ]

    base = _format_record(last_success, correo, note_last_success=bool(failures_after))
    if not failures_after:
        return base

    latest_failure = max(failures_after, key=lambda r: r.received_at)
    detail = _RESULTADO_DETAIL_LABELS.get(_resultado(latest_failure), "error desconocido")
    warning = (
        f"\n\n⚠️ Hubo {len(failures_after)} intento(s) fallido(s) después de esta fecha "
        f"(último: {_format_datetime(latest_failure.received_at)}, {detail}). Si necesitabas "
        "mover a otra tienda, verificá el código/nombre e intentá de nuevo."
    )
    return base + warning
