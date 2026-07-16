from __future__ import annotations

import base64

import pytest

from whatsaap_backend.application.bulk_csv import (
    CsvParseError,
    build_traslado_text,
    is_csv_attachment,
    parse_traslado_csv,
)
from whatsaap_backend.domain.models import MessageAttachment


def _attachment(text: str, mime_type: str = "text/csv") -> MessageAttachment:
    return MessageAttachment(
        mime_type=mime_type,
        base64_content=base64.b64encode(text.encode("utf-8")).decode("ascii"),
        file_name="traslados.csv",
    )


SEMICOLON_CSV = (
    "CEDULA;Nombre;CORREO;TIENDA;Promotor;Celular\n"
    "1116788925;Darlys Johana Vargas;johana.vargas@movilpt.co;309 TIENDA YOPAL;WOM;00001116788925\n"
    "63526490;Carolina P;carolina.pinzon@movilpt.co;151 TIENDA PIEDECUESTA;WOM;3000000001\n"
)

COMMA_CSV = "Cedula,Nombre,Correo,Tienda\n123,Ana,ana@example.com,100 TIENDA CENTRO\n"


def test_parses_semicolon_delimited_csv_with_accented_headers() -> None:
    result = parse_traslado_csv(_attachment(SEMICOLON_CSV), max_rows=200)
    assert len(result.rows) == 2
    assert result.skipped == ()
    first = result.rows[0]
    assert first.cedula == "1116788925"
    assert first.correo == "johana.vargas@movilpt.co"
    assert first.tienda == "309 TIENDA YOPAL"
    assert first.promotor == "WOM"


def test_parses_comma_delimited_csv_without_optional_columns() -> None:
    result = parse_traslado_csv(_attachment(COMMA_CSV), max_rows=200)
    assert len(result.rows) == 1
    assert result.rows[0].promotor == ""
    assert result.rows[0].celular == ""


def test_skips_rows_missing_required_fields_without_discarding_the_rest() -> None:
    csv_text = (
        "Cedula,Nombre,Correo,Tienda\n"
        "111,Ana,,100 TIENDA CENTRO\n"
        "222,Beto,beto@x.co,200 TIENDA SUR\n"
    )
    result = parse_traslado_csv(_attachment(csv_text), max_rows=200)
    assert len(result.rows) == 1
    assert result.rows[0].cedula == "222"
    assert len(result.skipped) == 1
    assert result.skipped[0][0] == 1
    assert "correo" in result.skipped[0][1]


def test_rejects_file_missing_required_columns() -> None:
    csv_text = "Nombre,Fecha\nAna,2026-01-01\n"
    with pytest.raises(CsvParseError, match="faltan columnas requeridas"):
        parse_traslado_csv(_attachment(csv_text), max_rows=200)


def test_rejects_file_exceeding_max_rows() -> None:
    header = "Cedula,Nombre,Correo,Tienda\n"
    body = "".join(f"{i},Persona {i},p{i}@x.co,100 TIENDA\n" for i in range(5))
    with pytest.raises(CsvParseError, match="más de 3 filas"):
        parse_traslado_csv(_attachment(header + body), max_rows=3)


def test_rejects_empty_csv() -> None:
    with pytest.raises(CsvParseError, match="no tiene filas"):
        parse_traslado_csv(_attachment("Cedula,Nombre,Correo,Tienda\n"), max_rows=200)


def test_rejects_invalid_base64() -> None:
    bad = MessageAttachment(mime_type="text/csv", base64_content="not-base64!!!", file_name="x.csv")
    with pytest.raises(CsvParseError, match="base64"):
        parse_traslado_csv(bad, max_rows=200)


def test_build_traslado_text_matches_the_labeled_format_the_script_parses() -> None:
    result = parse_traslado_csv(_attachment(SEMICOLON_CSV), max_rows=200)
    text = build_traslado_text(result.rows[0])
    assert text == (
        "TRASLADO TIENDA\n"
        "Promotor: WOM\n"
        "Nombre Completo: Darlys Johana Vargas\n"
        "Cédula: 1116788925\n"
        "Celular: 00001116788925\n"
        "Correo: johana.vargas@movilpt.co\n"
        "Nueva tienda: 309 TIENDA YOPAL"
    )


class TestIsCsvAttachment:
    def test_true_for_csv_mimetype(self) -> None:
        assert is_csv_attachment(_attachment(SEMICOLON_CSV, mime_type="text/csv"))

    def test_true_for_csv_filename_with_generic_mimetype(self) -> None:
        attachment = MessageAttachment(
            mime_type="application/octet-stream",
            base64_content="x",
            file_name="traslados.CSV",
        )
        assert is_csv_attachment(attachment)

    def test_false_for_unrelated_document(self) -> None:
        attachment = MessageAttachment(
            mime_type="application/pdf", base64_content="x", file_name="a.pdf"
        )
        assert not is_csv_attachment(attachment)

    def test_false_for_none(self) -> None:
        assert not is_csv_attachment(None)
