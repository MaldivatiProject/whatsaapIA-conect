from __future__ import annotations

from datetime import UTC, datetime

from whatsaap_backend.application.query_traslado import build_traslado_query_reply
from whatsaap_backend.domain.models import BusinessMessage, BusinessMessageOrigin


def _record(received_at: datetime | None = None, **metadata: object) -> BusinessMessage:
    return BusinessMessage(
        tenant_id="acme",
        source_origin=BusinessMessageOrigin.WHATSAPP,
        business_category="traslado_tienda",
        metadata=dict(metadata),
        received_at=received_at or datetime.now(UTC),
    )


def test_formats_a_found_record_with_completado_estado() -> None:
    # 14:32 UTC on 2026-07-16 is 09:32 in America/Bogota (UTC-5, no DST).
    record = _record(
        received_at=datetime(2026, 7, 16, 14, 32, tzinfo=UTC),
        resultado="GUARDADO",
        NOMBRE_COMPLETO="Ada Lovelace",
        CORREO="ada@example.com",
        NUEVA_TIENDA="Kiosco Único",
        solicitado_at="2026-07-16T14:30:00+00:00",
    )

    reply = build_traslado_query_reply([record], "ada@example.com")

    assert reply == (
        "CONSULTA TRASLADO TIENDA\n"
        "Estado: Completado\n"
        "Nombre Completo: Ada Lovelace\n"
        "CORREO: ada@example.com\n"
        "Nueva tienda: Kiosco Único\n"
        "Fecha de solicitud: 16/07/2026 09:30\n"
        "Fecha de traslado: 16/07/2026 09:32"
    )


def test_missing_solicitado_at_renders_an_em_dash() -> None:
    record = _record(
        received_at=datetime(2026, 7, 16, 14, 32, tzinfo=UTC),
        resultado="GUARDADO",
        CORREO="ada@example.com",
    )

    reply = build_traslado_query_reply([record], "ada@example.com")

    assert "Fecha de solicitud: —\n" in reply
    assert "Fecha de traslado: 16/07/2026 09:32" in reply


def test_ya_correcta_also_maps_to_completado() -> None:
    record = _record(resultado="YA_CORRECTA", CORREO="ada@example.com")
    reply = build_traslado_query_reply([record], "ada@example.com")
    assert "Estado: Completado" in reply


def test_error_style_resultados_map_to_error() -> None:
    resultados = ("NO_ENCONTRADO", "TIENDA_NO_ENCONTRADA", "ERROR_GUARDADO", "ERROR", "SIN_EMAIL")
    for resultado in resultados:
        record = _record(resultado=resultado, CORREO="ada@example.com")
        reply = build_traslado_query_reply([record], "ada@example.com")
        assert "Estado: Error" in reply


def test_missing_fields_render_as_empty_strings() -> None:
    record = _record(resultado="GUARDADO")

    reply = build_traslado_query_reply([record], "ada@example.com")

    assert "Nombre Completo: \n" in reply
    # Falls back to the queried email when CORREO wasn't captured in metadata.
    assert "CORREO: ada@example.com\n" in reply


def test_unknown_resultado_maps_to_desconocido() -> None:
    record = _record(resultado="SOME_FUTURE_STATUS", CORREO="ada@example.com")
    reply = build_traslado_query_reply([record], "ada@example.com")
    assert "Estado: Desconocido" in reply


def test_no_records_returns_a_not_found_message() -> None:
    reply = build_traslado_query_reply([], "ghost@example.com")
    assert reply == "No encontramos ningún traslado registrado para el correo ghost@example.com."


def test_all_attempts_failed_shows_the_latest_one_plainly() -> None:
    # No success anywhere in the history — nothing to fall back to, just
    # report the most recent attempt as-is (records passed most-recent-first).
    records = [
        _record(
            received_at=datetime(2026, 7, 16, 9, 0, tzinfo=UTC),
            resultado="TIENDA_NO_ENCONTRADA",
            CORREO="ana@example.com",
        ),
        _record(
            received_at=datetime(2026, 7, 15, 9, 0, tzinfo=UTC),
            resultado="NO_ENCONTRADO",
            CORREO="ana@example.com",
        ),
    ]

    reply = build_traslado_query_reply(records, "ana@example.com")

    assert "Estado: Error" in reply
    assert "último éxito registrado" not in reply
    assert "intento(s) fallido(s)" not in reply


def test_reports_last_success_and_warns_about_a_single_failed_retry_after_it() -> None:
    records = [
        _record(
            received_at=datetime(2026, 7, 16, 9, 6, tzinfo=UTC),
            resultado="TIENDA_NO_ENCONTRADA",
            CORREO="jesus@example.com",
        ),
        _record(
            received_at=datetime(2026, 7, 13, 17, 11, tzinfo=UTC),
            resultado="YA_CORRECTA",
            NOMBRE_COMPLETO="Jesus Alberto",
            CORREO="jesus@example.com",
            NUEVA_TIENDA="132 TIENDA PLAZA CENTRAL",
        ),
    ]

    reply = build_traslado_query_reply(records, "jesus@example.com")

    assert "Estado: Completado (último éxito registrado)" in reply
    assert "Nueva tienda: 132 TIENDA PLAZA CENTRAL" in reply
    # received_at of the *success* record is still what's reported as "Fecha de
    # traslado" — the failed retry doesn't get to claim that field.
    assert "Fecha de traslado: 13/07/2026 12:11" in reply
    assert (
        "⚠️ Hubo 1 intento(s) fallido(s) después de esta fecha "
        "(último: 16/07/2026 04:06, tienda no encontrada)"
    ) in reply


def test_counts_every_failed_retry_after_the_last_success() -> None:
    records = [
        _record(
            received_at=datetime(2026, 7, 16, 9, 0, tzinfo=UTC),
            resultado="TIENDA_NO_ENCONTRADA",
            CORREO="jesus@example.com",
        ),
        _record(
            received_at=datetime(2026, 7, 15, 23, 0, tzinfo=UTC),
            resultado="TIENDA_NO_ENCONTRADA",
            CORREO="jesus@example.com",
        ),
        _record(
            received_at=datetime(2026, 7, 13, 17, 0, tzinfo=UTC),
            resultado="YA_CORRECTA",
            CORREO="jesus@example.com",
            NUEVA_TIENDA="132 TIENDA PLAZA CENTRAL",
        ),
    ]

    reply = build_traslado_query_reply(records, "jesus@example.com")

    assert "Hubo 2 intento(s) fallido(s)" in reply
    # The most recent of the two failures is the one named in the warning.
    assert "último: 16/07/2026 04:00" in reply


def test_a_failed_attempt_before_the_last_success_does_not_trigger_a_warning() -> None:
    # An earlier failure that was later fixed by a real success shouldn't be
    # reported as an unresolved retry.
    records = [
        _record(
            received_at=datetime(2026, 7, 13, 17, 0, tzinfo=UTC),
            resultado="YA_CORRECTA",
            CORREO="jesus@example.com",
            NUEVA_TIENDA="132 TIENDA PLAZA CENTRAL",
        ),
        _record(
            received_at=datetime(2026, 7, 12, 9, 0, tzinfo=UTC),
            resultado="TIENDA_NO_ENCONTRADA",
            CORREO="jesus@example.com",
        ),
    ]

    reply = build_traslado_query_reply(records, "jesus@example.com")

    assert "Estado: Completado" in reply
    assert "último éxito registrado" not in reply
    assert "intento(s) fallido(s)" not in reply
