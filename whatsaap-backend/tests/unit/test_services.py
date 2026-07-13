from __future__ import annotations

from whatsaap_backend.application.services import extract_email


def test_extract_email_finds_first_address_in_text() -> None:
    text = "Nombre Completo: Ada\nCORREO jesus.quinonestem@movilpt.co\nNueva tienda: X"
    assert extract_email(text) == "jesus.quinonestem@movilpt.co"


def test_extract_email_returns_empty_string_when_absent() -> None:
    assert extract_email("no hay correo acá") == ""


def test_extract_email_ignores_surrounding_markdown() -> None:
    assert extract_email("*CORREO* prodriguez@alocredit.co") == "prodriguez@alocredit.co"
