"""JSON contract between SubprocessScriptSandbox (trusted host) and the
sandboxed _supervisor.py subprocess. Only the response side is validated
here with pydantic — the request is built entirely by trusted code, and
_supervisor.py itself must stay stdlib-only (it cannot import pydantic).
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel


class ScriptSandboxLimits(BaseModel):
    cpu_seconds: int
    max_processes: int
    max_open_files: int


class ScriptSandboxRequest(BaseModel):
    """Top-level shape written (as JSON) to the supervisor's stdin."""

    script_source: str
    input: dict[str, Any]
    limits: ScriptSandboxLimits


class ScriptSandboxResponse(BaseModel):
    """Top-level shape read (as JSON) from the supervisor's stdout."""

    ok: bool
    business_data: dict[str, Any] | None = None
    reply_text: str | None = None
    error: str | None = None

    model_config = {"extra": "ignore"}
