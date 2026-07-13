"""Runs *inside* the sandboxed subprocess as `python3 -I <this file>`.

STDLIB ONLY. Do not import pydantic, structlog, sqlalchemy, or anything
from `whatsaap_backend.config`/`whatsaap_backend.application` — this process
runs with a stripped, credential-less environment (see
SubprocessScriptSandbox), and importing app machinery here would be both
pointless (nothing it needs is reachable) and a way to accidentally leak
internal shape/expectations into a process whose whole point is disposable
and untrusted-code-safe.

Isolation model (revised — see git history for the earlier namespace-based
design): RUN_SCRIPT actions may need to reach the public internet (e.g. an
uploaded script using Selenium to drive headless Chrome), so this process
does *not* attempt Linux namespace isolation (os.unshare) — that was
empirically found to be incompatible with Chrome/chromedriver: both
RLIMIT_AS (Chrome reserves large virtual-memory regions independent of
actual usage) and a nested PID namespace (Chrome's multi-process
architecture — zygote/renderer/GPU/crashpad — needs a real init to reap
children, and consistently raised SIGTRAP when nested under our own
double-fork) broke it reproducibly across repeated runs.

What *is* still enforced here:
  - `PR_SET_NO_NEW_PRIVS` (defense in depth).
  - `RLIMIT_CPU` / `RLIMIT_NPROC` / `RLIMIT_NOFILE` / `RLIMIT_FSIZE` /
    `RLIMIT_CORE` (no RLIMIT_AS — see above).
  - The parent (SubprocessScriptSandbox) enforces a wall-clock timeout and
    SIGKILLs the whole process group on expiry — the actual backstop for
    scripts that don't hit the CPU limit (e.g. blocked on I/O).
  - No secrets/DB/AMQP credentials in the environment (enforced by the
    parent, not by this file).
What is *not* enforced anymore: network isolation, process-tree/PID
isolation, and a hard memory ceiling. Container-level `cap_drop: [ALL]` and
`init: true` (see docker-compose.yml) remain as blast-radius reduction.
"""

from __future__ import annotations

import ctypes
import json
import resource
import sys
from typing import Any

_PR_SET_NO_NEW_PRIVS = 38

_SCRATCH_FILE_SIZE_BYTES = 200 * 1024 * 1024


def _write_response(payload: dict[str, Any]) -> None:
    sys.stdout.write(json.dumps(payload))
    sys.stdout.write("\n")
    sys.stdout.flush()


def _apply_hardening(limits: dict[str, int]) -> None:
    libc = ctypes.CDLL("libc.so.6", use_errno=True)
    libc.prctl(_PR_SET_NO_NEW_PRIVS, 1, 0, 0, 0)

    cpu_seconds = int(limits["cpu_seconds"])
    resource.setrlimit(resource.RLIMIT_CPU, (cpu_seconds, cpu_seconds))
    max_processes = int(limits["max_processes"])
    resource.setrlimit(resource.RLIMIT_NPROC, (max_processes, max_processes))
    max_open_files = int(limits["max_open_files"])
    resource.setrlimit(resource.RLIMIT_NOFILE, (max_open_files, max_open_files))
    resource.setrlimit(resource.RLIMIT_FSIZE, (_SCRATCH_FILE_SIZE_BYTES, _SCRATCH_FILE_SIZE_BYTES))
    resource.setrlimit(resource.RLIMIT_CORE, (0, 0))


def _run_user_script(script_source: str, message: dict[str, Any]) -> dict[str, Any]:
    """Compile + exec the uploaded script and call its handle(message).

    Catches BaseException deliberately: an uploaded script raising, calling
    sys.exit(), or hitting a KeyboardInterrupt-like signal must always turn
    into a structured {"ok": false, "error": ...} result, never a crash of
    this supervisor process — the caller depends on always getting exactly
    one JSON line back.
    """

    try:
        module_namespace: dict[str, Any] = {"__name__": "__rule_script__"}
        code = compile(script_source, "<rule_script>", "exec")
        exec(code, module_namespace)  # noqa: S102 # nosec B102
        # This exec() is a controlled boundary, not a bypass of one: by the
        # time this line runs, RLIMIT_* and PR_SET_NO_NEW_PRIVS are already
        # applied, the process env holds no secrets/DB credentials (see
        # SubprocessScriptSandbox), and the parent enforces a hard
        # wall-clock timeout with a SIGKILL on the whole process group.
        handler = module_namespace.get("handle")
        if not callable(handler):
            return {"ok": False, "error": "script must define a top-level def handle(message)"}
        result = handler(message)
        if not isinstance(result, dict):
            return {"ok": False, "error": "handle() must return a dict"}
        business_data = result.get("business_data")
        reply_text = result.get("reply_text")
        if business_data is not None and not isinstance(business_data, dict):
            return {"ok": False, "error": "business_data must be a dict or null"}
        if reply_text is not None and not isinstance(reply_text, str):
            return {"ok": False, "error": "reply_text must be a string or null"}
        return {"ok": True, "business_data": business_data, "reply_text": reply_text, "error": None}
    except BaseException as exc:  # noqa: BLE001 - see docstring
        return {"ok": False, "error": f"{type(exc).__name__}: {exc}"}


def main() -> int:
    request = json.loads(sys.stdin.read())
    script_source = str(request["script_source"])
    message = dict(request["input"]["message"])
    limits = dict(request["limits"])

    _apply_hardening(limits)
    response = _run_user_script(script_source, message)
    _write_response(response)
    return 0


if __name__ == "__main__":
    sys.exit(main())
