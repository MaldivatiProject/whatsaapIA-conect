#!/usr/bin/env python3
"""whatsapp-connector — CLI manager."""

import os
import subprocess
import sys
import shutil
import shlex
import json
import time
import webbrowser
import urllib.request
import urllib.error
from pathlib import Path

# ── Colores ANSI ──────────────────────────────────────────────────────────────
R = "\033[0m"
BOLD = "\033[1m"
DIM = "\033[2m"
GREEN = "\033[32m"
YELLOW = "\033[33m"
CYAN = "\033[36m"
RED = "\033[31m"
BLUE = "\033[34m"
MAGENTA = "\033[35m"
WHITE = "\033[97m"

PROJECT_DIR = Path(__file__).parent.resolve()
ENV_FILE = PROJECT_DIR / ".env"
ENV_EXAMPLE = PROJECT_DIR / ".env.example"

# Cuando se invoca con --direct la acción corre en esta terminal (no abre otra).
DIRECT_MODE = "--direct" in sys.argv


# ── Helpers ───────────────────────────────────────────────────────────────────

def clear():
    os.system("clear" if os.name == "posix" else "cls")


def run(cmd: str, cwd: Path = PROJECT_DIR) -> int:
    """Run a shell command, streaming output. Returns exit code."""
    print(f"\n{DIM}▶ {cmd}{R}\n")
    result = subprocess.run(cmd, shell=True, cwd=cwd)
    return result.returncode


def ok(msg: str):
    print(f"{GREEN}✔ {msg}{R}")


def warn(msg: str):
    print(f"{YELLOW}⚠ {msg}{R}")


def err(msg: str):
    print(f"{RED}✖ {msg}{R}")


def info(msg: str):
    print(f"{CYAN}ℹ {msg}{R}")


def pause():
    input(f"\n{DIM}Presiona Enter para continuar...{R}")


def available(cmd: str) -> bool:
    return shutil.which(cmd) is not None


def node_modules_ok() -> bool:
    return (PROJECT_DIR / "node_modules" / ".package-lock.json").exists() or \
           (PROJECT_DIR / "node_modules" / "typescript").exists()


def env_ok() -> bool:
    return ENV_FILE.exists()


def get_server_port() -> int:
    """Read PORT from .env, fallback to 3000."""
    if ENV_FILE.exists():
        for line in ENV_FILE.read_text().splitlines():
            line = line.strip()
            if line.startswith("PORT=") and not line.startswith("#"):
                try:
                    return int(line.split("=", 1)[1].strip())
                except ValueError:
                    pass
    return 3000


def base_url() -> str:
    return f"http://localhost:{get_server_port()}"


def api_get(path: str, timeout: int = 5) -> tuple[int, object]:
    """HTTP GET. Returns (status_code, body_as_python_object)."""
    url = f"{base_url()}{path}"
    try:
        with urllib.request.urlopen(url, timeout=timeout) as resp:
            body = json.loads(resp.read().decode())
            return resp.status, body
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
        except Exception:
            body = {"error": str(e)}
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}


def api_post(path: str, payload: dict) -> tuple[int, object]:
    """HTTP POST JSON. Returns (status_code, body_as_python_object)."""
    url = f"{base_url()}{path}"
    data = json.dumps(payload).encode()
    req = urllib.request.Request(
        url, data=data,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            try:
                body = json.loads(resp.read().decode())
            except Exception:
                body = {}
            return resp.status, body
    except urllib.error.HTTPError as e:
        try:
            body = json.loads(e.read().decode())
        except Exception:
            body = {"error": str(e)}
        return e.code, body
    except Exception as e:
        return 0, {"error": str(e)}


def api_delete(path: str) -> int:
    """HTTP DELETE. Returns status_code."""
    url = f"{base_url()}{path}"
    req = urllib.request.Request(url, method="DELETE")
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            return resp.status
    except urllib.error.HTTPError as e:
        return e.code
    except Exception:
        return 0


def server_is_up() -> bool:
    code, _ = api_get("/health")
    return code == 200


def print_json(obj: object):
    print(json.dumps(obj, indent=2, ensure_ascii=False))


def detect_container_runtime() -> str:
    """Returns 'docker', 'podman', or ''."""
    if available("docker"):
        return "docker"
    if available("podman"):
        return "podman"
    return ""


def compose_cmd(runtime: str) -> str:
    """Returns the correct compose command for the runtime."""
    if runtime == "docker":
        r = subprocess.run("docker compose version", shell=True,
                           capture_output=True)
        return "docker compose" if r.returncode == 0 else "docker-compose"
    if runtime == "podman":
        if available("podman-compose"):
            return "podman-compose"
        return "podman compose"
    return ""


# ── Nueva terminal ─────────────────────────────────────────────────────────────

def open_in_terminal(cmd: str, title: str = "whatsapp-connector") -> bool:
    """
    Spawn `cmd` in a new terminal window. Non-blocking.
    Returns True if a terminal emulator was found and launched.
    """
    if sys.platform == "darwin":
        esc = cmd.replace("\\", "\\\\").replace('"', '\\"')
        script = (
            f'tell application "Terminal" to do script '
            f'"cd {str(PROJECT_DIR)} && {esc}"'
        )
        try:
            subprocess.Popen(
                ["osascript", "-e", script],
                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
            )
            return True
        except Exception:
            pass

    # Linux — emuladores en orden de preferencia
    candidates = [
        ("konsole",        ["konsole", "--title", title, "-e", "bash", "-c", cmd]),
        ("gnome-terminal", ["gnome-terminal", f"--title={title}", "--", "bash", "-c", cmd]),
        ("kitty",          ["kitty", f"--title={title}", "bash", "-c", cmd]),
        ("alacritty",      ["alacritty", "--title", title, "-e", "bash", "-c", cmd]),
        ("xfce4-terminal", ["xfce4-terminal", f"--title={title}", "-x", "bash", "-c", cmd]),
        ("terminator",     ["terminator", f"--title={title}", "-x", "bash", "-c", cmd]),
        ("tilix",          ["tilix", f"--title={title}", "-e", f"bash -c {shlex.quote(cmd)}"]),
        ("xterm",          ["xterm", "-title", title, "-e", "bash", "-c", cmd]),
    ]

    for name, args in candidates:
        if shutil.which(name):
            try:
                subprocess.Popen(
                    args, cwd=PROJECT_DIR,
                    stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                )
                return True
            except Exception:
                continue

    return False


# Título visible en la barra de la nueva terminal para cada opción
OPTION_TITLES = {
    "1":  "npm install — whatsapp-connector",
    "2":  "start:dev — whatsapp-connector",
    "3":  "build — whatsapp-connector",
    "4":  "unit tests — whatsapp-connector",
    "5":  "e2e tests — whatsapp-connector",
    "6":  "typecheck — whatsapp-connector",
    "7":  "lint — whatsapp-connector",
    "8":  "docker build — whatsapp-connector",
    "9":  "docker up — whatsapp-connector",
    "10": "docker up+redis — whatsapp-connector",
    "11": "docker up+postgres — whatsapp-connector",
    "12": "docker down — whatsapp-connector",
    "13": "docker restart — whatsapp-connector",
    "14": "docker logs — whatsapp-connector",
    "15": "docker status — whatsapp-connector",
    "16": "health check — whatsapp-connector",
    "17": "listar sesiones — whatsapp-connector",
    "18": "crear sesion — whatsapp-connector",
    "19": "configurar .env — whatsapp-connector",
    "20": "limpiar dist — whatsapp-connector",
    "21": "Conectar WhatsApp",
    "22": "Ver QR WhatsApp (terminal + browser)",
    "23": "Estado sesiones WhatsApp",
    "24": "Desconectar sesion WhatsApp",
    "25": "Eliminar sesion WhatsApp",
}


# ── Acciones ──────────────────────────────────────────────────────────────────

def ensure_env():
    if not env_ok():
        warn(".env no existe — copiando desde .env.example")
        if ENV_EXAMPLE.exists():
            shutil.copy(ENV_EXAMPLE, ENV_FILE)
            ok(".env creado. Editalo antes de continuar en producción.")
        else:
            err(".env.example no encontrado")


def action_install():
    code = run("npm install")
    ok("Dependencias instaladas") if code == 0 else err(f"npm install falló (código {code})")
    pause()


def action_start_dev():
    ensure_env()
    if not node_modules_ok():
        warn("node_modules no encontrado — instalando dependencias primero")
        run("npm install")
    info("Iniciando en modo desarrollo. Ctrl+C para detener.")
    run("npm run start:dev")
    pause()


def action_build():
    code = run("npm run build")
    ok("Build exitoso en dist/") if code == 0 else err("Build falló")
    pause()


def action_test_unit():
    if not node_modules_ok():
        warn("Instalando dependencias primero")
        run("npm install")
    code = run("npm test")
    ok("Tests unitarios OK") if code == 0 else err("Tests fallaron")
    pause()


def action_test_e2e():
    if not node_modules_ok():
        run("npm install")
    code = run("npm run test:e2e")
    ok("Tests E2E OK") if code == 0 else err("Tests E2E fallaron")
    pause()


def action_typecheck():
    code = run("npx tsc --noEmit")
    ok("Sin errores de tipos") if code == 0 else err("Errores de TypeScript encontrados")
    pause()


def action_lint():
    code = run("npm run lint")
    ok("Lint OK") if code == 0 else err("Lint falló")
    pause()


def action_setup_env():
    if env_ok():
        warn(f".env ya existe en {ENV_FILE}")
        resp = input("  ¿Sobreescribir? [s/N]: ").strip().lower()
        if resp != "s":
            info("Cancelado")
            pause()
            return
    if ENV_EXAMPLE.exists():
        shutil.copy(ENV_EXAMPLE, ENV_FILE)
        ok(f".env creado en {ENV_FILE}")
        info(f"Editalo con: nano {ENV_FILE}")
    else:
        err(".env.example no encontrado")
    pause()


def action_clean():
    dist = PROJECT_DIR / "dist"
    coverage = PROJECT_DIR / "coverage"
    removed = []
    for path in [dist, coverage]:
        if path.exists():
            shutil.rmtree(path)
            removed.append(path.name)
    if removed:
        ok(f"Eliminado: {', '.join(removed)}/")
    else:
        info("Nada que limpiar")
    pause()


def _container_action(label: str, cmd: str, runtime: str):
    if not runtime:
        err("Docker/Podman no encontrado en el sistema")
        pause()
        return
    ensure_env()
    code = run(cmd)
    ok(f"{label} completado") if code == 0 else err(f"{label} falló (código {code})")
    pause()


def action_docker_build(runtime: str):
    compose = compose_cmd(runtime)
    _container_action("Build", f"{compose} build", runtime)


def action_docker_up(runtime: str, profile: str = ""):
    compose = compose_cmd(runtime)
    profile_flag = f"--profile {profile}" if profile else ""
    _container_action(
        "Levantar",
        f"{compose} {profile_flag} up -d",
        runtime,
    )


def action_docker_down(runtime: str):
    compose = compose_cmd(runtime)
    _container_action("Detener", f"{compose} down", runtime)


def action_docker_restart(runtime: str):
    compose = compose_cmd(runtime)
    _container_action("Reiniciar", f"{compose} restart", runtime)


def action_docker_logs(runtime: str):
    compose = compose_cmd(runtime)
    info("Ctrl+C para salir de los logs")
    run(f"{compose} logs -f whatsapp-connector")
    pause()


def action_docker_status(runtime: str):
    if runtime == "docker":
        run("docker ps --filter 'name=whatsapp-connector' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
    elif runtime == "podman":
        run("podman ps --filter 'name=whatsapp-connector' --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
    else:
        err("Docker/Podman no encontrado")
    pause()


# ── WhatsApp Connection Flow ──────────────────────────────────────────────────

def _check_server() -> bool:
    """Verify the server is up; print guidance if not."""
    if server_is_up():
        return True
    err("El servidor no está corriendo.")
    info(f"Inicialo primero con la opción [2] (local) o [9] (Docker) — puerto {get_server_port()}")
    return False


def _ask_session_id(prompt: str = "ID de sesión") -> str:
    sid = input(f"\n  {CYAN}{prompt}{R} (ej: mi-sesion): ").strip()
    if not sid:
        warn("ID vacío — cancelado")
    return sid


def action_whatsapp_connect():
    """Flujo completo: crear sesión → esperar QR → abrir navegador."""
    print(f"\n{BOLD}{GREEN}── CONECTAR WHATSAPP ─────────────────────────────{R}")

    if not _check_server():
        pause()
        return

    session_id = _ask_session_id("Nombre de la nueva sesión")
    if not session_id:
        pause()
        return

    # 1. Crear sesión
    print(f"\n  {DIM}Creando sesión '{session_id}'...{R}")
    code, body = api_post("/sessions", {"sessionId": session_id})

    if code == 201:
        ok(f"Sesión '{session_id}' creada")
    elif code == 409:
        warn(f"La sesión '{session_id}' ya existe — intentando abrir su QR de todas formas")
    else:
        err(f"Error al crear sesión (HTTP {code})")
        print_json(body)
        pause()
        return

    # 2. Esperar a que Baileys genere el QR (polling)
    print(f"\n  {DIM}Esperando QR de Baileys", end="", flush=True)
    qr_ready = False
    for _ in range(20):
        time.sleep(1)
        print(".", end="", flush=True)
        qr_code, qr_body = api_get(f"/sessions/{session_id}/qr")
        if qr_code == 200:
            qr_ready = True
            break
    print(f"{R}")

    if not qr_ready:
        warn("El QR todavía no está disponible. Baileys puede tardar unos segundos más.")
        info(f"Podés abrirlo manualmente en: {base_url()}/sessions/{session_id}/qr-page")
        pause()
        return

    # 3. Abrir navegador
    qr_page = f"{base_url()}/sessions/{session_id}/qr-page"
    print(f"\n  {GREEN}✔ QR listo{R}")
    print(f"\n  {BOLD}Abriendo navegador en:{R}")
    print(f"  {CYAN}{qr_page}{R}\n")

    print(f"  {BOLD}En tu celular:{R}")
    print(f"  {WHITE}1.{R} Abre WhatsApp")
    print(f"  {WHITE}2.{R} Toca ⋮  →  Dispositivos vinculados")
    print(f"  {WHITE}3.{R} Toca  Vincular un dispositivo")
    print(f"  {WHITE}4.{R} Apunta la cámara al QR del navegador\n")

    webbrowser.open(qr_page)

    # 4. Monitorear estado hasta conectado o timeout
    print(f"  {DIM}Esperando que escanees el QR", end="", flush=True)
    for _ in range(60):
        time.sleep(2)
        sc, sb = api_get(f"/sessions/{session_id}/qr")
        # QR desaparece cuando la sesión se conecta
        if sc == 404:
            s_code, s_body = api_get("/sessions")
            sessions = s_body if isinstance(s_body, list) else []
            session = next((s for s in sessions if s.get("id") == session_id), None)
            if session and session.get("isConnected"):
                print(f"{R}\n")
                ok(f"¡WhatsApp conectado! Sesión '{session_id}' activa.")
                break
        print(".", end="", flush=True)
    else:
        print(f"{R}\n")
        warn("Tiempo de espera agotado. Verificá el estado con la opción [23].")

    pause()


def action_whatsapp_open_qr():
    """Ver QR: en terminal (siempre) y en navegador si hay display."""
    if not _check_server():
        pause()
        return

    code, body = api_get("/sessions")
    sessions = body if isinstance(body, list) else []

    if not sessions:
        warn("No hay sesiones creadas. Usá la opción [21] para crear una.")
        pause()
        return

    print(f"\n  {BOLD}Sesiones disponibles:{R}")
    for s in sessions:
        status_color = GREEN if s.get("isConnected") else YELLOW
        print(f"  {WHITE}·{R} {s['id']}  {status_color}[{s.get('status', '?')}]{R}")

    session_id = _ask_session_id("ID de sesión para ver QR")
    if not session_id:
        pause()
        return

    # ── QR en la terminal ────────────────────────────────────────────────────
    print()
    qr_url = f"{base_url()}/sessions/{session_id}/qr-terminal"
    try:
        with urllib.request.urlopen(qr_url, timeout=5) as resp:
            print(resp.read().decode())
    except urllib.error.HTTPError as e:
        if e.code == 404:
            warn("QR no disponible aún — la sesión puede estar cargando o ya conectada.")
        else:
            err(f"Error al obtener QR (HTTP {e.code})")
    except Exception as ex:
        err(f"No se pudo obtener el QR: {ex}")

    # ── Abrir navegador si hay entorno gráfico ───────────────────────────────
    display = os.environ.get("DISPLAY") or os.environ.get("WAYLAND_DISPLAY")
    if display:
        qr_page = f"{base_url()}/sessions/{session_id}/qr-page"
        info(f"Abriendo navegador: {qr_page}")
        webbrowser.open(qr_page)
    else:
        info("Sin entorno gráfico — escaneá el QR de arriba desde tu celular.")

    pause()


def action_whatsapp_status():
    """Mostrar estado de todas las sesiones de WhatsApp."""
    if not _check_server():
        pause()
        return

    code, body = api_get("/sessions")
    sessions = body if isinstance(body, list) else []

    if not sessions:
        info("No hay sesiones registradas.")
        pause()
        return

    print(f"\n  {BOLD}{'ID':<25} {'ESTADO':<18} {'CONECTADO':<12} {'CREADA'}{R}")
    print(f"  {DIM}{'─'*70}{R}")
    for s in sessions:
        connected = s.get("isConnected", False)
        conn_icon = f"{GREEN}✔ Sí{R}" if connected else f"{RED}✖ No{R}"
        status = s.get("status", "?")
        status_color = GREEN if connected else (YELLOW if status in ("qr_ready", "connecting") else DIM)
        created = s.get("createdAt", "")[:19].replace("T", " ")
        print(f"  {WHITE}{s['id']:<25}{R} {status_color}{status:<18}{R} {conn_icon:<20} {DIM}{created}{R}")

    print()
    pause()


def action_whatsapp_disconnect():
    """Desconectar una sesión sin eliminarla."""
    if not _check_server():
        pause()
        return

    session_id = _ask_session_id("ID de sesión a desconectar")
    if not session_id:
        pause()
        return

    code, body = api_post(f"/sessions/{session_id}/disconnect", {})
    if code in (200, 204):
        ok(f"Sesión '{session_id}' desconectada. Podés reconectar con la opción [21].")
    else:
        err(f"Error al desconectar (HTTP {code})")
        print_json(body)
    pause()


def action_whatsapp_delete():
    """Eliminar una sesión permanentemente."""
    if not _check_server():
        pause()
        return

    session_id = _ask_session_id("ID de sesión a ELIMINAR")
    if not session_id:
        pause()
        return

    resp = input(f"\n  {RED}¿Eliminar '{session_id}' permanentemente? [s/N]:{R} ").strip().lower()
    if resp != "s":
        info("Cancelado")
        pause()
        return

    code = api_delete(f"/sessions/{session_id}")
    if code in (200, 204):
        ok(f"Sesión '{session_id}' eliminada.")
    elif code == 404:
        warn(f"Sesión '{session_id}' no encontrada.")
    else:
        err(f"Error al eliminar (HTTP {code})")
    pause()


def action_curl_health():
    info("Probando http://localhost:3000/health")
    if not available("curl"):
        err("curl no disponible")
        pause()
        return
    run("curl -s -o /dev/null -w 'HTTP %{http_code}\\n' http://localhost:3000/health || echo 'Servicio no disponible'")
    run("curl -s http://localhost:3000/health | python3 -m json.tool 2>/dev/null || true")
    pause()


def action_curl_sessions():
    info("GET http://localhost:3000/sessions")
    run("curl -s http://localhost:3000/sessions | python3 -m json.tool 2>/dev/null || echo 'Servicio no disponible'")
    pause()


def action_create_session():
    session_id = input(f"\n{CYAN}Nombre de sesión (ej: mi-sesion): {R}").strip()
    if not session_id:
        warn("Nombre vacío — cancelado")
        pause()
        return
    cmd = (
        f"curl -s -X POST http://localhost:3000/sessions "
        f"-H 'Content-Type: application/json' "
        f"-d '{{\"sessionId\": \"{session_id}\"}}' | python3 -m json.tool"
    )
    run(cmd)
    info(f"Para ver el QR: curl http://localhost:3000/sessions/{session_id}/qr")
    pause()


# ── Menú ──────────────────────────────────────────────────────────────────────

def server_status_label() -> str:
    up = server_is_up()
    return f"{GREEN}✔ corriendo :{get_server_port()}{R}" if up else f"{RED}✖ detenido{R}"


def header(runtime: str):
    rt_color = GREEN if runtime else RED
    rt_label = runtime.upper() if runtime else "NO DETECTADO"
    compose = compose_cmd(runtime) if runtime else "-"
    env_label = f"{GREEN}✔ .env{R}" if env_ok() else f"{YELLOW}⚠ sin .env{R}"
    deps_label = f"{GREEN}✔ node_modules{R}" if node_modules_ok() else f"{YELLOW}⚠ sin instalar{R}"

    print(f"""
{BOLD}{CYAN}╔══════════════════════════════════════════════════╗
║        whatsapp-connector — manager              ║
╚══════════════════════════════════════════════════╝{R}
  Runtime : {rt_color}{BOLD}{rt_label}{R}   Compose: {DIM}{compose}{R}
  Entorno : {env_label}   Deps: {deps_label}
  Servidor: {server_status_label()}
{DIM}{'─' * 50}{R}""")


def print_menu(runtime: str):
    print(f"""
  {BOLD}{BLUE}── DESARROLLO LOCAL ──────────────────────────────{R}
  {WHITE}[1]{R}  Instalar dependencias       {DIM}npm install{R}
  {WHITE}[2]{R}  Iniciar en modo desarrollo  {DIM}npm run start:dev{R}
  {WHITE}[3]{R}  Build producción            {DIM}npm run build{R}
  {WHITE}[4]{R}  Unit tests                  {DIM}npm test{R}
  {WHITE}[5]{R}  E2E tests                   {DIM}npm run test:e2e{R}
  {WHITE}[6]{R}  Type check                  {DIM}tsc --noEmit{R}
  {WHITE}[7]{R}  Lint                        {DIM}npm run lint{R}

  {BOLD}{BLUE}── CONTENEDORES ({runtime.upper() if runtime else 'N/A'}) ──────────────────────────{R}
  {WHITE}[8]{R}  Build imagen
  {WHITE}[9]{R}  Levantar (solo app)
  {WHITE}[10]{R} Levantar + Redis
  {WHITE}[11]{R} Levantar + PostgreSQL
  {WHITE}[12]{R} Detener contenedores
  {WHITE}[13]{R} Reiniciar contenedores
  {WHITE}[14]{R} Ver logs (streaming)
  {WHITE}[15]{R} Estado de contenedores

  {BOLD}{GREEN}── CONECTAR WHATSAPP 📱 ──────────────────────────{R}
  {WHITE}[21]{R} {BOLD}Conectar WhatsApp{R}          {DIM}crear sesión → QR → abrir navegador{R}
  {WHITE}[22]{R} Ver QR de sesión existente  {DIM}abre qr-page en el navegador{R}
  {WHITE}[23]{R} Estado de sesiones          {DIM}lista con estado de conexión{R}
  {WHITE}[24]{R} Desconectar sesión          {DIM}desconectar sin eliminar{R}
  {WHITE}[25]{R} Eliminar sesión             {DIM}elimina permanentemente{R}

  {BOLD}{BLUE}── PRUEBAS API (requiere servidor activo) ────────{R}
  {WHITE}[16]{R} Health check
  {WHITE}[17]{R} Listar sesiones (JSON)
  {WHITE}[18]{R} Crear sesión (manual)

  {BOLD}{BLUE}── UTILIDADES ────────────────────────────────────{R}
  {WHITE}[19]{R} Configurar .env desde .env.example
  {WHITE}[20]{R} Limpiar dist/ y coverage/

  {RED}[0]{R}  Salir
""")


def _dispatch(choice: str, runtime: str):
    """Ejecuta la acción directamente (usado en modo --direct y como fallback)."""
    actions = {
        "1":  action_install,
        "2":  action_start_dev,
        "3":  action_build,
        "4":  action_test_unit,
        "5":  action_test_e2e,
        "6":  action_typecheck,
        "7":  action_lint,
        "8":  lambda: action_docker_build(runtime),
        "9":  lambda: action_docker_up(runtime),
        "10": lambda: action_docker_up(runtime, "redis"),
        "11": lambda: action_docker_up(runtime, "postgres"),
        "12": lambda: action_docker_down(runtime),
        "13": lambda: action_docker_restart(runtime),
        "14": lambda: action_docker_logs(runtime),
        "15": lambda: action_docker_status(runtime),
        "16": action_curl_health,
        "17": action_curl_sessions,
        "18": action_create_session,
        "19": action_setup_env,
        "20": action_clean,
        "21": action_whatsapp_connect,
        "22": action_whatsapp_open_qr,
        "23": action_whatsapp_status,
        "24": action_whatsapp_disconnect,
        "25": action_whatsapp_delete,
    }
    action = actions.get(choice)
    if action:
        action()
    elif choice != "0":
        warn("Opción no válida")
        pause()


def handle_choice(choice: str, runtime: str):
    """
    En modo normal: abre una nueva terminal con esta opción.
    En modo --direct: ejecuta la acción directamente.
    """
    if DIRECT_MODE:
        _dispatch(choice, runtime)
        return

    # Abrir en nueva terminal
    script = shlex.quote(str(PROJECT_DIR / "manage.py"))
    cmd = f"python3 {script} --direct --run {shlex.quote(choice)}"
    title = OPTION_TITLES.get(choice, f"opción {choice} — whatsapp-connector")

    opened = open_in_terminal(cmd, title)
    if opened:
        ok(f"Abriendo [{choice}] en nueva terminal: {DIM}{title}{R}")
        time.sleep(0.4)
    else:
        warn("No se detectó emulador de terminal — ejecutando aquí.")
        _dispatch(choice, runtime)


def main():
    runtime = detect_container_runtime()

    # Modo --direct --run N: ejecutar una sola opción y salir
    if DIRECT_MODE:
        try:
            run_idx = sys.argv.index("--run")
            choice = sys.argv[run_idx + 1]
        except (ValueError, IndexError):
            err("Uso: manage.py --direct --run <opción>")
            sys.exit(1)
        clear()
        header(runtime)
        _dispatch(choice, runtime)
        return

    # Menú interactivo normal
    while True:
        clear()
        header(runtime)
        print_menu(runtime)

        try:
            choice = input(f"  {BOLD}Opción:{R} ").strip()
        except (KeyboardInterrupt, EOFError):
            print(f"\n{DIM}Saliendo...{R}")
            sys.exit(0)

        if choice == "0":
            print(f"\n{DIM}Hasta luego.{R}\n")
            sys.exit(0)

        clear()
        handle_choice(choice, runtime)


if __name__ == "__main__":
    main()
