"""PII-safe log helpers. Mirrors whatsapp-connector's shared/context/hashJid()."""

from __future__ import annotations

import hashlib


def hash_jid(jid: str) -> str:
    """Truncated SHA-256 of a JID/phone number for correlation without exposing PII."""
    return hashlib.sha256(jid.encode("utf-8")).hexdigest()[:12]
