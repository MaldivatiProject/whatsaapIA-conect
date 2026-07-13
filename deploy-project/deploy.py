#!/usr/bin/env python3
"""Assisted deployment for the WhatsApp IA platform."""

from __future__ import annotations

import argparse
import base64
import os
import secrets
import shutil
import subprocess
import sys
import time
from pathlib import Path


PROJECT_DIR = Path(__file__).resolve().parent
ROOT_DIR = PROJECT_DIR.parent
COMPOSE_FILE = PROJECT_DIR / "docker-compose.yml"
ENV_FILE = PROJECT_DIR / ".env"
ENV_EXAMPLE = PROJECT_DIR / ".env.example"

INFRA_SERVICES = ["postgres", "valkey", "rabbitmq"]
BACKEND_SERVICES = [
    "whatsaap-backend-api",
    "whatsaap-backend-worker-rules",
    "whatsaap-backend-worker-delivery",
    "whatsaap-backend-outbox-relay",
    "whatsaap-backend-connector-bridge",
]
APP_SERVICES = BACKEND_SERVICES + ["whatsapp-connector", "whatsapp-dashboard"]
SERVICE_CONTAINERS = {
    "postgres": "whatsapp-platform-postgres",
    "valkey": "whatsapp-platform-valkey",
    "rabbitmq": "whatsapp-platform-rabbitmq",
    "whatsaap-backend-api": "whatsaap-backend-api",
    "whatsaap-backend-worker-rules": "whatsaap-backend-worker-rules",
    "whatsaap-backend-worker-delivery": "whatsaap-backend-worker-delivery",
    "whatsaap-backend-outbox-relay": "whatsaap-backend-outbox-relay",
    "whatsaap-backend-connector-bridge": "whatsaap-backend-connector-bridge",
    "whatsapp-connector": "whatsapp-connector",
    "whatsapp-dashboard": "whatsapp-dashboard",
}

ENV_LAYOUT: list[tuple[str, list[str]]] = [
    ("Project identity", ["COMPOSE_PROJECT_NAME", "DOCKER_NETWORK_NAME"]),
    (
        "Public host ports",
        ["CONNECTOR_HOST_PORT", "BACKEND_HOST_PORT", "DASHBOARD_HOST_PORT", "RABBITMQ_MANAGEMENT_PORT"],
    ),
    (
        "Public browser-facing URLs baked into whatsapp-dashboard at build time",
        ["PUBLIC_CONNECTOR_API_URL", "PUBLIC_CONNECTOR_WS_URL", "PUBLIC_RULES_API_URL"],
    ),
    ("Shared tenant/API credentials", ["TENANT_ID", "API_KEY_SECRET", "AUTH_ENABLED"]),
    (
        "Shared webhook secret used by whatsapp-connector and whatsaap-backend",
        ["WEBHOOK_SECRET", "WEBHOOK_ENABLED", "WEBHOOK_PROCESSING_MODE"],
    ),
    ("WhatsApp session encryption key: base64 of exactly 32 bytes", ["AUTH_STATE_ENCRYPTION_KEY"]),
    ("Runtime modes", ["NODE_ENV", "APP_ENV", "CONNECTOR_LOG_LEVEL", "BACKEND_LOG_LEVEL"]),
    (
        "PostgreSQL shared by backend migrations and optional connector persistence",
        [
            "POSTGRES_DB",
            "POSTGRES_USER",
            "POSTGRES_PASSWORD",
            "POSTGRES_HOST_BIND",
            "POSTGRES_HOST_PORT",
            "DATABASE_SCHEMA",
            "DB_POOL_SIZE",
        ],
    ),
    (
        "RabbitMQ shared event bus",
        [
            "RABBITMQ_DEFAULT_USER",
            "RABBITMQ_DEFAULT_PASS",
            "RABBITMQ_DEFAULT_VHOST",
            "RABBITMQ_PREFETCH",
            "RABBITMQ_TOPOLOGY_ENABLED",
        ],
    ),
    (
        "Connector runtime",
        [
            "SESSION_PROVIDER",
            "ENABLE_VALKEY",
            "CONNECTOR_ENABLE_POSTGRES",
            "MAX_SESSIONS",
            "RECONNECT_INTERVAL_MS",
            "MAX_RECONNECT_ATTEMPTS",
            "HEARTBEAT_INTERVAL_MS",
            "ENABLE_WEBSOCKET",
            "ENABLE_EVENTS",
            "CORS_ENABLED",
            "CONNECTOR_CORS_ORIGINS",
            "MAX_MEDIA_SIZE_MB",
            "RATE_LIMIT_MAX_PER_MINUTE",
            "RATE_LIMIT_MIN_DELAY_MS",
            "HTTP_RATE_LIMIT_TTL_MS",
            "HTTP_RATE_LIMIT_MAX",
            "METRICS_ENABLED",
            "HEALTH_MAX_HEAP_MB",
            "SWAGGER_ENABLED",
            "TLS_ENABLED",
            "TLS_CERT_PATH",
            "TLS_KEY_PATH",
        ],
    ),
    (
        "Backend runtime",
        [
            "BACKEND_CORS_ORIGINS",
            "CONNECTOR_TIMEOUT_SECONDS",
            "OUTBOX_BATCH_SIZE",
            "OUTBOX_POLL_INTERVAL_SECONDS",
            "OUTBOX_MAX_ATTEMPTS",
            "OUTBOX_STALE_LOCK_SECONDS",
        ],
    ),
]

SECRET_KEYS = {
    "API_KEY_SECRET",
    "AUTH_STATE_ENCRYPTION_KEY",
    "POSTGRES_PASSWORD",
    "RABBITMQ_DEFAULT_PASS",
    "WEBHOOK_SECRET",
}


def parse_env(path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not path.exists():
        return values
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip("'").strip('"')
        if key:
            values[key] = value
    return values


def write_env(values: dict[str, str]) -> None:
    known_keys = {key for _, keys in ENV_LAYOUT for key in keys}
    lines: list[str] = []
    for section, keys in ENV_LAYOUT:
        if lines:
            lines.append("")
        lines.append(f"# {section}")
        for key in keys:
            lines.append(f"{key}={values.get(key, '')}")

    unknown_keys = sorted(key for key in values if key not in known_keys)
    if unknown_keys:
        lines.append("")
        lines.append("# Custom values preserved")
        for key in unknown_keys:
            lines.append(f"{key}={values[key]}")

    ENV_FILE.write_text("\n".join(lines) + "\n", encoding="utf-8")
    try:
        ENV_FILE.chmod(0o600)
    except OSError:
        pass


def first_api_key(raw: str | None) -> tuple[str, str] | None:
    if not raw:
        return None
    for item in raw.split(","):
        tenant, separator, secret = item.strip().partition(":")
        if separator and tenant.strip() and len(secret.strip()) >= 16:
            return tenant.strip(), secret.strip()
    return None


def is_base64_32(value: str | None) -> bool:
    if not value:
        return False
    try:
        return len(base64.b64decode(value, validate=True)) == 32
    except Exception:
        return False


def is_placeholder(value: str | None) -> bool:
    if not value:
        return True
    lowered = value.lower()
    return (
        lowered.startswith("change-me")
        or lowered.startswith("your-")
        or "change-me" in lowered
        or "example" in lowered
    )


def generated_secret(key: str) -> str:
    if key == "AUTH_STATE_ENCRYPTION_KEY":
        return base64.b64encode(secrets.token_bytes(32)).decode("ascii")
    if key == "WEBHOOK_SECRET":
        return secrets.token_urlsafe(48)
    if key == "API_KEY_SECRET":
        return secrets.token_urlsafe(32)
    return secrets.token_urlsafe(24)


def import_existing_values() -> dict[str, str]:
    imported: dict[str, str] = {}
    connector_env = parse_env(ROOT_DIR / "whatsapp-connector" / ".env")
    backend_env = parse_env(ROOT_DIR / "whatsaap-backend" / ".env")

    api_key = first_api_key(connector_env.get("API_KEYS")) or first_api_key(backend_env.get("API_KEYS"))
    if api_key:
        imported["TENANT_ID"], imported["API_KEY_SECRET"] = api_key
    elif backend_env.get("CONNECTOR_API_KEY"):
        imported["API_KEY_SECRET"] = backend_env["CONNECTOR_API_KEY"]

    for source in (connector_env, backend_env):
        if source.get("WEBHOOK_SECRET"):
            imported.setdefault("WEBHOOK_SECRET", source["WEBHOOK_SECRET"])

    if connector_env.get("AUTH_STATE_ENCRYPTION_KEY"):
        imported["AUTH_STATE_ENCRYPTION_KEY"] = connector_env["AUTH_STATE_ENCRYPTION_KEY"]

    if connector_env.get("POSTGRES_PASSWORD"):
        imported["POSTGRES_PASSWORD"] = connector_env["POSTGRES_PASSWORD"]
    elif backend_env.get("FLYWAY_PASSWORD"):
        imported["POSTGRES_PASSWORD"] = backend_env["FLYWAY_PASSWORD"]

    passthrough = {
        "NODE_ENV": connector_env.get("NODE_ENV"),
        "APP_ENV": backend_env.get("APP_ENV"),
        "SESSION_PROVIDER": connector_env.get("SESSION_PROVIDER"),
        "MAX_SESSIONS": connector_env.get("MAX_SESSIONS"),
        "RECONNECT_INTERVAL_MS": connector_env.get("RECONNECT_INTERVAL_MS"),
        "MAX_RECONNECT_ATTEMPTS": connector_env.get("MAX_RECONNECT_ATTEMPTS"),
        "HEARTBEAT_INTERVAL_MS": connector_env.get("HEARTBEAT_INTERVAL_MS"),
        "ENABLE_WEBSOCKET": connector_env.get("ENABLE_WEBSOCKET"),
        "ENABLE_EVENTS": connector_env.get("ENABLE_EVENTS"),
        "CORS_ENABLED": connector_env.get("CORS_ENABLED"),
        "CONNECTOR_CORS_ORIGINS": connector_env.get("CORS_ORIGINS"),
        "MAX_MEDIA_SIZE_MB": connector_env.get("MAX_MEDIA_SIZE_MB"),
        "RATE_LIMIT_MAX_PER_MINUTE": connector_env.get("RATE_LIMIT_MAX_PER_MINUTE"),
        "RATE_LIMIT_MIN_DELAY_MS": connector_env.get("RATE_LIMIT_MIN_DELAY_MS"),
        "HTTP_RATE_LIMIT_TTL_MS": connector_env.get("HTTP_RATE_LIMIT_TTL_MS"),
        "HTTP_RATE_LIMIT_MAX": connector_env.get("HTTP_RATE_LIMIT_MAX"),
        "METRICS_ENABLED": connector_env.get("METRICS_ENABLED"),
        "HEALTH_MAX_HEAP_MB": connector_env.get("HEALTH_MAX_HEAP_MB"),
        "TLS_ENABLED": connector_env.get("TLS_ENABLED"),
        "TLS_CERT_PATH": connector_env.get("TLS_CERT_PATH"),
        "TLS_KEY_PATH": connector_env.get("TLS_KEY_PATH"),
        "BACKEND_CORS_ORIGINS": backend_env.get("CORS_ORIGINS"),
        "DB_POOL_SIZE": backend_env.get("DB_POOL_SIZE"),
        "DATABASE_SCHEMA": backend_env.get("DATABASE_SCHEMA"),
        "RABBITMQ_PREFETCH": backend_env.get("RABBITMQ_PREFETCH"),
        "RABBITMQ_TOPOLOGY_ENABLED": backend_env.get("RABBITMQ_TOPOLOGY_ENABLED"),
        "CONNECTOR_TIMEOUT_SECONDS": backend_env.get("CONNECTOR_TIMEOUT_SECONDS"),
        "WEBHOOK_PROCESSING_MODE": backend_env.get("WEBHOOK_PROCESSING_MODE"),
        "OUTBOX_BATCH_SIZE": backend_env.get("OUTBOX_BATCH_SIZE"),
        "OUTBOX_POLL_INTERVAL_SECONDS": backend_env.get("OUTBOX_POLL_INTERVAL_SECONDS"),
        "OUTBOX_MAX_ATTEMPTS": backend_env.get("OUTBOX_MAX_ATTEMPTS"),
        "OUTBOX_STALE_LOCK_SECONDS": backend_env.get("OUTBOX_STALE_LOCK_SECONDS"),
    }
    for key, value in passthrough.items():
        if value:
            imported[key] = value

    return imported


def default_values() -> dict[str, str]:
    values = parse_env(ENV_EXAMPLE)
    values.update(import_existing_values())
    values.update(parse_env(ENV_FILE))

    values.setdefault("TENANT_ID", "acme")
    values["ENABLE_VALKEY"] = values.get("ENABLE_VALKEY") or "true"
    values["SESSION_PROVIDER"] = values.get("SESSION_PROVIDER") or "valkey"

    for key in SECRET_KEYS:
        if key == "AUTH_STATE_ENCRYPTION_KEY":
            if not is_base64_32(values.get(key)) or is_placeholder(values.get(key)):
                values[key] = generated_secret(key)
            continue
        if is_placeholder(values.get(key)):
            values[key] = generated_secret(key)

    return values


def ask(prompt: str, default: str) -> str:
    answer = input(f"{prompt} [{default}]: ").strip()
    return answer or default


def init_env(assume_yes: bool = False) -> None:
    values = default_values()
    if not assume_yes:
        print("Inicializando deploy-project/.env")
        print("Se importan valores no sensibles y secretos existentes cuando ya estan configurados.")
        values["TENANT_ID"] = ask("Tenant/owner ID", values["TENANT_ID"])
        values["CONNECTOR_HOST_PORT"] = ask("Puerto publico whatsapp-connector", values["CONNECTOR_HOST_PORT"])
        values["DASHBOARD_HOST_PORT"] = ask("Puerto publico whatsapp-dashboard", values["DASHBOARD_HOST_PORT"])
        values["BACKEND_HOST_PORT"] = ask("Puerto publico whatsaap-backend", values["BACKEND_HOST_PORT"])
        values["RABBITMQ_MANAGEMENT_PORT"] = ask(
            "Puerto publico RabbitMQ Management", values["RABBITMQ_MANAGEMENT_PORT"]
        )
        if ENV_FILE.exists():
            confirm = input("Actualizar .env conservando valores existentes? [Y/n]: ").strip().lower()
            if confirm in {"n", "no"}:
                print("No se modifico .env.")
                return

    write_env(values)
    print(f"OK: entorno central escrito en {ENV_FILE}")
    print("Nota: API_KEY_SECRET queda en .env y es la clave para ingresar al dashboard.")


def command_exists(command: list[str]) -> bool:
    try:
        subprocess.run(command, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)
    except (OSError, subprocess.CalledProcessError):
        return False
    return True


def docker_compose_base() -> list[str]:
    if shutil.which("docker") and command_exists(["docker", "compose", "version"]):
        return ["docker", "compose"]
    if shutil.which("docker-compose") and command_exists(["docker-compose", "version"]):
        return ["docker-compose"]
    raise SystemExit("No encontre Docker Compose. Instala Docker con el plugin compose v2.")


def run(command: list[str], *, capture: bool = False, check: bool = True) -> subprocess.CompletedProcess[str]:
    printable = " ".join(command)
    if not capture:
        print(f"$ {printable}")
    return subprocess.run(
        command,
        cwd=PROJECT_DIR,
        text=True,
        stdout=subprocess.PIPE if capture else None,
        stderr=subprocess.PIPE if capture else None,
        check=check,
    )


def compose(args: list[str], *, capture: bool = False, check: bool = True) -> subprocess.CompletedProcess[str]:
    if not ENV_FILE.exists():
        raise SystemExit("Falta .env. Ejecuta primero: python3 deploy.py init")
    command = docker_compose_base() + ["--env-file", str(ENV_FILE), "-f", str(COMPOSE_FILE)] + args
    return run(command, capture=capture, check=check)


def docker(args: list[str], *, capture: bool = False, check: bool = True) -> subprocess.CompletedProcess[str]:
    if not shutil.which("docker"):
        raise SystemExit("No encontre Docker.")
    return run(["docker"] + args, capture=capture, check=check)


def ensure_network(values: dict[str, str]) -> None:
    network = values.get("DOCKER_NETWORK_NAME", "whatsapp-platform")
    inspected = docker(["network", "inspect", network], capture=True, check=False)
    if inspected.returncode == 0:
        print(f"OK: red Docker existente: {network}")
        return
    docker(["network", "create", network])


def service_container_id(service: str) -> str:
    result = compose(["ps", "-q", service], capture=True, check=False)
    return result.stdout.strip()


def service_health(container_id: str) -> str:
    if not container_id:
        return "missing"
    template = "{{if .State.Health}}{{.State.Health.Status}}{{else}}{{.State.Status}}{{end}}"
    result = docker(["inspect", "--format", template, container_id], capture=True, check=False)
    if result.returncode != 0:
        return "missing"
    return result.stdout.strip() or "unknown"


def expected_project(values: dict[str, str]) -> str:
    return values.get("COMPOSE_PROJECT_NAME") or "whatsaapia-platform"


def inspect_container(name: str) -> dict[str, str] | None:
    template = (
        "{{.Name}}\t"
        "{{index .Config.Labels \"com.docker.compose.project\"}}\t"
        "{{index .Config.Labels \"com.docker.compose.service\"}}\t"
        "{{.State.Status}}"
    )
    result = docker(["inspect", "--format", template, name], capture=True, check=False)
    if result.returncode != 0:
        return None
    raw_name, project, service, status = (result.stdout.strip().split("\t") + ["", "", "", ""])[:4]
    return {
        "name": raw_name.removeprefix("/"),
        "project": "" if project == "<no value>" else project,
        "service": "" if service == "<no value>" else service,
        "status": status,
    }


def foreign_container_conflicts(values: dict[str, str]) -> list[dict[str, str]]:
    project = expected_project(values)
    conflicts: list[dict[str, str]] = []
    for service, container_name in SERVICE_CONTAINERS.items():
        info = inspect_container(container_name)
        if info is None:
            continue
        if info["project"] != project:
            conflicts.append({**info, "expected_service": service})
    return conflicts


def format_conflicts(conflicts: list[dict[str, str]]) -> str:
    lines = [
        "Contenedores con nombres esperados por deploy-project, pero creados por otro compose:",
    ]
    for item in conflicts:
        owner = item["project"] or "sin-label-compose"
        service = item["service"] or "desconocido"
        lines.append(
            f"- {item['name']}: owner={owner}/{service}, status={item['status']}, "
            f"esperado_por={item['expected_service']}"
        )
    return "\n".join(lines)


def assert_no_foreign_containers(values: dict[str, str]) -> None:
    conflicts = foreign_container_conflicts(values)
    if not conflicts:
        return
    raise SystemExit(
        f"{format_conflicts(conflicts)}\n\n"
        "El stack esta partido entre varios docker-compose. Para que deploy-project "
        "tome control, ejecuta: python3 deploy.py up --build --takeover"
    )


def takeover_foreign_containers(values: dict[str, str], assume_yes: bool) -> None:
    conflicts = foreign_container_conflicts(values)
    if not conflicts:
        print("OK: no hay contenedores conflictivos de otros compose.")
        return

    print(format_conflicts(conflicts))
    print(
        "\nTakeover removera SOLO estos contenedores conflictivos para que deploy-project "
        "los recree. No elimina volumenes Docker."
    )
    if not assume_yes:
        answer = input("Continuar con takeover? [y/N]: ").strip().lower()
        if answer not in {"y", "yes", "s", "si"}:
            raise SystemExit("Takeover cancelado.")

    names = [item["name"] for item in conflicts]
    docker(["rm", "-f", *names])


def wait_for_services(services: list[str], timeout_seconds: int) -> None:
    deadline = time.monotonic() + timeout_seconds
    last_status: dict[str, str] = {}
    pending = set(services)

    while pending and time.monotonic() < deadline:
        for service in list(pending):
            status = service_health(service_container_id(service))
            if last_status.get(service) != status:
                print(f"{service}: {status}")
                last_status[service] = status
            if status in {"healthy", "running", "exited"}:
                pending.remove(service)
            elif status == "unhealthy":
                raise SystemExit(f"{service} esta unhealthy. Revisa: python3 deploy.py logs {service}")
        if pending:
            time.sleep(3)

    if pending:
        names = ", ".join(sorted(pending))
        raise SystemExit(f"Timeout esperando servicios: {names}")


def deploy_up(
    build: bool,
    skip_migrate: bool,
    timeout_seconds: int,
    assume_yes: bool,
    takeover: bool,
) -> None:
    if not ENV_FILE.exists():
        init_env(assume_yes=assume_yes)

    values = parse_env(ENV_FILE)
    ensure_network(values)
    compose(["config"], capture=True)
    if takeover:
        takeover_foreign_containers(values, assume_yes)
    else:
        assert_no_foreign_containers(values)

    print("\n[1/5] Infraestructura base")
    compose(["up", "-d", *INFRA_SERVICES])
    wait_for_services(INFRA_SERVICES, timeout_seconds)

    if not skip_migrate:
        print("\n[2/5] Migraciones Flyway")
        compose(["run", "--rm", "migrate"])
    else:
        print("\n[2/5] Migraciones omitidas por --skip-migrate")

    print("\n[3/5] Backend")
    backend_args = ["up", "-d", "--no-deps"]
    if build:
        backend_args.append("--build")
    compose(backend_args + BACKEND_SERVICES)
    wait_for_services(BACKEND_SERVICES, timeout_seconds)

    print("\n[4/5] Connector")
    connector_args = ["up", "-d", "--no-deps"]
    if build:
        connector_args.append("--build")
    compose(connector_args + ["whatsapp-connector"])
    wait_for_services(["whatsapp-connector"], timeout_seconds)

    print("\n[5/5] Dashboard")
    dashboard_args = ["up", "-d", "--no-deps"]
    if build:
        dashboard_args.append("--build")
    compose(dashboard_args + ["whatsapp-dashboard"])
    wait_for_services(["whatsapp-dashboard"], timeout_seconds)

    print("\nPlataforma lista.")
    print(f"Dashboard:          http://localhost:{values.get('DASHBOARD_HOST_PORT', '3001')}")
    print(f"Connector REST:     http://localhost:{values.get('CONNECTOR_HOST_PORT', '3000')}")
    print(f"Backend API:        http://localhost:{values.get('BACKEND_HOST_PORT', '8000')}")
    print(f"RabbitMQ UI:        http://localhost:{values.get('RABBITMQ_MANAGEMENT_PORT', '15672')}")
    print("API key dashboard:  valor de API_KEY_SECRET en deploy-project/.env")


def deploy_migrate(timeout_seconds: int) -> None:
    values = parse_env(ENV_FILE)
    ensure_network(values)
    assert_no_foreign_containers(values)
    compose(["up", "-d", *INFRA_SERVICES])
    wait_for_services(INFRA_SERVICES, timeout_seconds)
    compose(["run", "--rm", "migrate"])


def deploy_down(remove_volumes: bool, assume_yes: bool) -> None:
    args = ["down", "--remove-orphans"]
    if remove_volumes:
        if not assume_yes:
            answer = input("Esto elimina volumenes de datos. Continuar? [y/N]: ").strip().lower()
            if answer not in {"y", "yes", "s", "si"}:
                print("Cancelado.")
                return
        args.append("--volumes")
    compose(args)


def print_plan() -> None:
    print(
        """Orden de despliegue:
1. Crear red externa whatsapp-platform si falta.
2. Levantar postgres, valkey y rabbitmq; esperar healthchecks.
3. Ejecutar migraciones Flyway del backend.
4. Levantar API, workers, outbox relay y connector bridge.
5. Levantar whatsapp-connector apuntando al webhook interno del backend.
6. Construir/levantar whatsapp-dashboard con URLs publicas de navegador."""
    )


def doctor() -> None:
    if not ENV_FILE.exists():
        print("Falta .env. Ejecuta: python3 deploy.py init")
        return
    values = parse_env(ENV_FILE)
    missing = [key for key in SECRET_KEYS if is_placeholder(values.get(key))]
    if missing:
        raise SystemExit(f"Secretos pendientes o placeholder: {', '.join(sorted(missing))}")
    if not is_base64_32(values.get("AUTH_STATE_ENCRYPTION_KEY")):
        raise SystemExit("AUTH_STATE_ENCRYPTION_KEY debe ser base64 de exactamente 32 bytes.")
    ensure_network(values)
    compose(["config"], capture=True)
    assert_no_foreign_containers(values)
    print("OK: Docker, red, .env y compose global validados.")


def interactive_menu() -> None:
    options = {
        "1": ("Inicializar/actualizar .env", lambda: init_env(False)),
        "2": ("Ver plan de despliegue", print_plan),
        "3": ("Desplegar todo", lambda: deploy_up(True, False, 240, False, False)),
        "4": ("Estado", lambda: compose(["ps"])),
        "5": ("Logs", lambda: compose(["logs", "-f", "--tail", "200"])),
        "6": ("Bajar stack", lambda: deploy_down(False, False)),
        "7": ("Doctor", doctor),
    }
    print("deploy-project")
    for key, (label, _) in options.items():
        print(f"{key}. {label}")
    choice = input("Selecciona una opcion: ").strip()
    action = options.get(choice)
    if not action:
        print("Opcion no reconocida.")
        return
    action[1]()


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Asistente de despliegue para whatsaapIA-conect.")
    sub = parser.add_subparsers(dest="command")

    init = sub.add_parser("init", help="Crea o actualiza deploy-project/.env")
    init.add_argument("-y", "--yes", action="store_true", help="No preguntar, generar valores seguros.")

    up = sub.add_parser("up", help="Despliega toda la plataforma en orden.")
    up.add_argument("--build", action="store_true", default=True, help="Construir imagenes antes de levantar.")
    up.add_argument("--no-build", action="store_false", dest="build", help="No reconstruir imagenes.")
    up.add_argument("--skip-migrate", action="store_true", help="Omitir migraciones Flyway.")
    up.add_argument("--timeout", type=int, default=240, help="Timeout por etapa en segundos.")
    up.add_argument("-y", "--yes", action="store_true", help="No preguntar si falta .env.")
    up.add_argument(
        "--takeover",
        action="store_true",
        help=(
            "Remueve contenedores con nombres esperados por deploy-project pero "
            "creados por otros compose, y luego despliega todo."
        ),
    )

    migrate = sub.add_parser("migrate", help="Ejecuta solo migraciones Flyway.")
    migrate.add_argument("--timeout", type=int, default=180)

    down = sub.add_parser("down", help="Detiene la plataforma.")
    down.add_argument("--volumes", action="store_true", help="Elimina tambien volumenes de datos.")
    down.add_argument("-y", "--yes", action="store_true", help="Confirma operaciones destructivas.")

    restart = sub.add_parser("restart", help="Reinicia servicios.")
    restart.add_argument("services", nargs="*", help="Servicios a reiniciar. Vacio reinicia apps.")

    logs = sub.add_parser("logs", help="Muestra logs.")
    logs.add_argument("services", nargs="*", help="Servicios a seguir.")
    logs.add_argument("-f", "--follow", action="store_true", help="Seguir logs.")
    logs.add_argument("--tail", default="200", help="Cantidad de lineas finales.")

    sub.add_parser("status", help="Muestra docker compose ps.")
    sub.add_parser("config", help="Renderiza el compose global.")
    sub.add_parser("plan", help="Muestra el orden de despliegue.")
    sub.add_parser("doctor", help="Valida Docker, .env, red y compose.")

    takeover = sub.add_parser(
        "takeover",
        help="Remueve contenedores conflictivos de otros compose sin borrar volumenes.",
    )
    takeover.add_argument("-y", "--yes", action="store_true", help="No pedir confirmacion.")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        if args.command is None:
            interactive_menu()
        elif args.command == "init":
            init_env(args.yes)
        elif args.command == "up":
            deploy_up(args.build, args.skip_migrate, args.timeout, args.yes, args.takeover)
        elif args.command == "migrate":
            deploy_migrate(args.timeout)
        elif args.command == "down":
            deploy_down(args.volumes, args.yes)
        elif args.command == "restart":
            services = args.services or APP_SERVICES
            compose(["restart", *services])
        elif args.command == "logs":
            log_args = ["logs", "--tail", args.tail]
            if args.follow:
                log_args.append("-f")
            compose(log_args + args.services)
        elif args.command == "status":
            compose(["ps"])
        elif args.command == "config":
            compose(["config"])
        elif args.command == "plan":
            print_plan()
        elif args.command == "doctor":
            doctor()
        elif args.command == "takeover":
            if not ENV_FILE.exists():
                raise SystemExit("Falta .env. Ejecuta primero: python3 deploy.py init")
            values = parse_env(ENV_FILE)
            ensure_network(values)
            takeover_foreign_containers(values, args.yes)
        else:
            parser.print_help()
            return 2
    except KeyboardInterrupt:
        print("\nCancelado.")
        return 130
    except subprocess.CalledProcessError as error:
        print(f"Comando fallo con codigo {error.returncode}.", file=sys.stderr)
        if error.stdout:
            print(error.stdout, file=sys.stderr)
        if error.stderr:
            print(error.stderr, file=sys.stderr)
        return error.returncode
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
