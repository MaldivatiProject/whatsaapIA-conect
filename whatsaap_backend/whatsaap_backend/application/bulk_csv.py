"""Parses bulk-upload CSVs attached to a "TRASLADO TIENDA" message into the
same field shape the existing RUN_SCRIPT automation already understands from
a single free-text message (see application.services.build_script_input and
the "Traslado de tienda" rule's script, which reads Cédula/Nombre
Completo/Correo/Nueva tienda labeled lines).

Kept deliberately separate from the sandbox: CSV parsing runs in trusted
application code, never inside the untrusted RUN_SCRIPT subprocess — the
sandbox's threat model (stripped env, no DB/AMQP credentials) stays unchanged.
"""

from __future__ import annotations

import base64
import csv
import io
import unicodedata
from dataclasses import dataclass

from whatsaap_backend.domain.models import MessageAttachment

_ENCODINGS = ("utf-8-sig", "utf-8", "latin-1", "cp1252")
_DELIMITERS = (";", ",")

# Canonical field -> accepted header spellings, already accent/case-normalized.
_HEADER_ALIASES: dict[str, tuple[str, ...]] = {
    "cedula": ("cedula",),
    "nombre": ("nombre",),
    "correo": ("correo", "email", "mail"),
    "tienda": ("tienda",),
    "promotor": ("promotor",),
    "celular": ("celular", "telefono"),
}
_REQUIRED_FIELDS = ("cedula", "correo", "tienda")


class CsvParseError(ValueError):
    """Raised for file-level problems (undecodable, no rows, too many rows) —
    as opposed to per-row problems, which are collected rather than raised."""


@dataclass(frozen=True, slots=True)
class TrasladoRow:
    index: int  # 1-based, matches the row's position in the uploaded file
    cedula: str
    nombre: str
    correo: str
    tienda: str
    promotor: str
    celular: str


@dataclass(frozen=True, slots=True)
class TrasladoCsvParseResult:
    rows: tuple[TrasladoRow, ...]
    skipped: tuple[tuple[int, str], ...]  # (row index, reason)


def _strip_accents(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    return "".join(ch for ch in normalized if not unicodedata.combining(ch))


def _normalize_header(raw: str) -> str:
    return _strip_accents(raw).strip().lower()


def _canonical_fieldnames(fieldnames: list[str]) -> dict[str, str]:
    """Maps each raw CSV header to a canonical field name, e.g. {'CÉDULA': 'cedula'}."""
    resolved: dict[str, str] = {}
    for raw in fieldnames:
        normalized = _normalize_header(raw)
        for canonical, aliases in _HEADER_ALIASES.items():
            if normalized in aliases:
                resolved[raw] = canonical
                break
    return resolved


def _decode(content: bytes) -> str:
    for encoding in _ENCODINGS:
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise CsvParseError("no se pudo leer el archivo con ninguna codificación soportada")


def _sniff_delimiter(sample: str) -> str:
    header_line = sample.splitlines()[0] if sample.splitlines() else ""
    return max(_DELIMITERS, key=header_line.count)


def parse_traslado_csv(attachment: MessageAttachment, *, max_rows: int) -> TrasladoCsvParseResult:
    """Parses a "traslado de tienda" bulk-upload CSV.

    Raises CsvParseError for file-level problems. Per-row problems (missing
    required field) are collected in `skipped` rather than raised — one bad
    row must not discard the rest of a 200-row file.
    """
    try:
        raw_bytes = base64.b64decode(attachment.base64_content, validate=True)
    except (ValueError, TypeError) as exc:
        raise CsvParseError("el adjunto no es un archivo base64 válido") from exc

    text = _decode(raw_bytes)
    delimiter = _sniff_delimiter(text)
    reader = csv.DictReader(io.StringIO(text), delimiter=delimiter)
    if not reader.fieldnames:
        raise CsvParseError("el archivo CSV no tiene encabezados")

    header_map = _canonical_fieldnames(list(reader.fieldnames))
    missing_required = [
        field for field in _REQUIRED_FIELDS if field not in header_map.values()
    ]
    if missing_required:
        raise CsvParseError(
            f"faltan columnas requeridas en el CSV: {', '.join(missing_required)}"
        )

    rows: list[TrasladoRow] = []
    skipped: list[tuple[int, str]] = []
    for index, raw_row in enumerate(reader, start=1):
        if index > max_rows:
            raise CsvParseError(
                f"el archivo tiene más de {max_rows} filas — dividilo en archivos más pequeños"
            )

        values: dict[str, str] = {}
        for raw_header, value in raw_row.items():
            canonical = header_map.get(raw_header)
            if canonical:
                values[canonical] = (value or "").strip()

        missing = [field for field in _REQUIRED_FIELDS if not values.get(field)]
        if missing:
            skipped.append((index, f"faltan campos requeridos: {', '.join(missing)}"))
            continue

        rows.append(
            TrasladoRow(
                index=index,
                cedula=values.get("cedula", ""),
                nombre=values.get("nombre", ""),
                correo=values.get("correo", ""),
                tienda=values.get("tienda", ""),
                promotor=values.get("promotor", ""),
                celular=values.get("celular", ""),
            )
        )

    if not rows and not skipped:
        raise CsvParseError("el archivo CSV no tiene filas de datos")

    return TrasladoCsvParseResult(rows=tuple(rows), skipped=tuple(skipped))


def build_traslado_text(row: TrasladoRow) -> str:
    """Formats a CSV row as the same labeled-line text the existing RUN_SCRIPT
    already parses from a single free-text "TRASLADO TIENDA" message — so the
    script itself needs zero changes to support bulk uploads."""
    lines = ["TRASLADO TIENDA"]
    if row.promotor:
        lines.append(f"Promotor: {row.promotor}")
    if row.nombre:
        lines.append(f"Nombre Completo: {row.nombre}")
    lines.append(f"Cédula: {row.cedula}")
    if row.celular:
        lines.append(f"Celular: {row.celular}")
    lines.append(f"Correo: {row.correo}")
    lines.append(f"Nueva tienda: {row.tienda}")
    return "\n".join(lines)


_MAX_SUMMARY_DETAIL_LINES = 20


def format_bulk_summary(
    successes: list[str], failures: list[str], skipped: tuple[tuple[int, str], ...]
) -> str:
    """Formats the single consolidated WhatsApp reply sent after a bulk CSV
    upload finishes — shared by both message-processing services (the
    AMQP/outbox path and the synchronous direct-delivery path)."""
    lines = [
        f"Traslados procesados: {len(successes)} exitosos, {len(failures)} con error"
        + (f", {len(skipped)} fila(s) omitida(s) por datos incompletos" if skipped else "")
        + "."
    ]
    if failures:
        lines.append("")
        lines.append("Errores:")
        lines.extend(f"- {line}" for line in failures[:_MAX_SUMMARY_DETAIL_LINES])
        if len(failures) > _MAX_SUMMARY_DETAIL_LINES:
            lines.append(f"... y {len(failures) - _MAX_SUMMARY_DETAIL_LINES} más.")
    if skipped:
        lines.append("")
        lines.append("Filas omitidas:")
        lines.extend(
            f"- Fila {index}: {reason}" for index, reason in skipped[:_MAX_SUMMARY_DETAIL_LINES]
        )
        if len(skipped) > _MAX_SUMMARY_DETAIL_LINES:
            lines.append(f"... y {len(skipped) - _MAX_SUMMARY_DETAIL_LINES} más.")
    return "\n".join(lines)


def is_csv_attachment(attachment: MessageAttachment | None) -> bool:
    """Thin wrapper kept for call-site readability — the actual check is pure
    domain logic (see MessageAttachment.is_csv_like), reused by the rule
    engine's has_csv_attachment condition."""
    return attachment is not None and attachment.is_csv_like
