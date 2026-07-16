"""Process-wide, in-memory cache of runtime-toggleable security settings.

Today this is a single flag: whether RuleActionSchema's hardcoded-credential
heuristic (see presentation/api/schemas.py) is enforced. It's read
synchronously from a Pydantic validator, which has no DB/async context
available — so the source of truth lives in Postgres (see
infrastructure/persistence/repositories.SqlAlchemySecuritySettingsRepository)
and this module just mirrors the current value for that one process.

Only whatsaap-backend-api reads params.secrets/RuleCreate/RuleUpdate through
this schema (worker-rules et al. read already-stored BusinessRule domain
objects directly, no Pydantic validation involved) — so a single in-process
cache, refreshed at startup and on every toggle via the settings endpoint,
is sufficient; no cross-process sync is needed.
"""

from __future__ import annotations

import threading

_lock = threading.Lock()
_allow_hardcoded_script_secrets = False


def get_allow_hardcoded_script_secrets() -> bool:
    with _lock:
        return _allow_hardcoded_script_secrets


def set_allow_hardcoded_script_secrets(value: bool) -> None:
    global _allow_hardcoded_script_secrets
    with _lock:
        _allow_hardcoded_script_secrets = value
