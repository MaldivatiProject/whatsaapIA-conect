import csv
import traceback
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import TimeoutException

# ==============================
# CONFIGURACIÓN
# ==============================
# Todas las rutas internas se derivan de la ubicación del script — portables a cualquier equipo
SCRIPTS_DIR       = Path(__file__).resolve().parent          # .../transfers/scripts
TRANSFERS_DIR     = SCRIPTS_DIR.parent                       # .../transfers
TECHNICAL_DIR     = TRANSFERS_DIR.parent.parent              # .../technical_support

WAIT_SEC  = 20
CSV_PATH  = TRANSFERS_DIR / "Docs" / "traslados_23052026.csv"

driver = webdriver.Chrome()
wait   = WebDriverWait(driver, WAIT_SEC)



# ==============================
# CONFIG LOADER
# ==============================
def cargar_config() -> dict:
    cfg      = {}
    var_path = TECHNICAL_DIR / "tools" / "vars" / ".var"
    with open(var_path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line or line.startswith("#") or "=" not in line:
                continue
            k, _, v = line.partition("=")
            cfg[k.strip()] = v.strip().strip('"').strip("'")
    return cfg


# ==============================
# CSV LOADER
# ==============================
def _normalizar_fila(fila: dict) -> dict:
    """Quita espacios al inicio/fin de claves y valores (Excel suele dejarlos al exportar/editar)."""
    return {
        (k.strip() if isinstance(k, str) else k): (v.strip() if isinstance(v, str) else v)
        for k, v in fila.items()
    }


CSV_DELIMITER = ";"  # el CSV se exporta desde Excel en configuración regional es-CO, que usa ';'


def cargar_csv() -> list:
    for enc in ("utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            with open(CSV_PATH, encoding=enc, newline="") as f:
                filas = [
                    _normalizar_fila(fila)
                    for fila in csv.DictReader(f, delimiter=CSV_DELIMITER)
                ]
            for fila in filas:
                if "RESULTADO" not in fila:
                    fila["RESULTADO"] = ""
            ya = sum(1 for f in filas if f["RESULTADO"] in ("GUARDADO", "YA_CORRECTA"))
            print(f"  CSV cargado ({enc}): {len(filas)} registros  ({ya} ya procesados)")
            return filas
        except UnicodeDecodeError:
            continue
    raise ValueError(f"No se pudo leer: {CSV_PATH}")


def guardar_csv_resultado(filas: list):
    campos = [k for k in filas[0].keys() if k != "RESULTADO"] + ["RESULTADO"]
    try:
        with open(CSV_PATH, "w", newline="", encoding="utf-8-sig") as f:
            writer = csv.DictWriter(f, fieldnames=campos, delimiter=CSV_DELIMITER)
            writer.writeheader()
            writer.writerows(filas)
        print(f"  💾 CSV guardado → {CSV_PATH.name}")
    except PermissionError:
        print(f"  ⚠️  CSV en uso (PermissionError) — cierra el archivo en Excel/VS Code")
    except Exception as e:
        print(f"  ❌ Error al guardar CSV: {type(e).__name__}: {e}")



# ==============================
# LOGIN
# ==============================
def login(usuario: str, password: str):
    driver.get("https://back.alocredit.co/login")
    wait.until(EC.visibility_of_element_located((By.ID, "email"))).send_keys(usuario)
    driver.find_element(By.ID, "password").send_keys(password)
    driver.find_element(By.ID, "kt_sign_in_submit").click()
    wait.until(EC.presence_of_element_located((By.ID, "kt_body")))
    print("✅ Login exitoso")


# ==============================
# IR A VENDEDORES
# ==============================
def ir_a_vendedor():
    menu = wait.until(
        EC.element_to_be_clickable(
            (By.XPATH, "//a[@href='/area-de-gestion-retailer/vendedor']")
        )
    )
    driver.execute_script("arguments[0].click();", menu)
    wait.until(EC.presence_of_element_located((By.ID, "kt_table_salesman_list")))
    print("✅ Vista vendedores cargada\n")


# ==============================
# BUSCAR VENDEDOR
# ==============================
def buscar_vendedor(email: str) -> bool:
    # Resetear filtro y esperar que el input quede vacío
    filtro = wait.until(
        EC.presence_of_element_located((By.CSS_SELECTOR, "input[placeholder='EMAIL']"))
    )
    btns_reset = driver.find_elements(By.CSS_SELECTOR, "[data-kt-filter='reset']")
    if btns_reset:
        driver.execute_script("arguments[0].click();", btns_reset[0])
        wait.until(lambda _: filtro.get_attribute("value") == "")

    # Capturar innerHTML actual antes de filtrar — DataTables puede tardar en actualizar
    tbody_antes = driver.execute_script(
        "var t = document.querySelector('#kt_table_salesman_list tbody');"
        "return t ? t.innerHTML : '';"
    )

    # Escribir email en el filtro vía JS
    driver.execute_script("""
        arguments[0].value = '';
        arguments[0].value = arguments[1];
        arguments[0].dispatchEvent(new Event('input', {bubbles: true}));
        arguments[0].dispatchEvent(new Event('keyup',  {bubbles: true}));
    """, filtro, email)

    # Clic en Buscar
    btns_buscar = driver.find_elements(By.CSS_SELECTOR, "[data-kt-filter='filter']")
    if btns_buscar:
        driver.execute_script("arguments[0].click();", btns_buscar[0])

    # Todo en JS — evita round-trips Python por cada fila en cada ciclo de polling
    wait.until(lambda d: d.execute_script("""
        var antes  = arguments[0];
        var tbody  = document.querySelector('#kt_table_salesman_list tbody');
        if (!tbody || tbody.innerHTML === antes) return false;
        if (tbody.querySelector('td.dataTables_empty')) return true;
        var rows = tbody.querySelectorAll('tr');
        for (var i = 0; i < rows.length; i++) {
            if (rows[i].offsetParent !== null && rows[i].textContent.trim()) return true;
        }
        return false;
    """, tbody_antes))

    sin_datos = driver.find_elements(
        By.CSS_SELECTOR, "#kt_table_salesman_list tbody td.dataTables_empty"
    )
    return len(sin_datos) == 0


# ==============================
# ABRIR MODAL EDITAR
# ==============================
def abrir_editar() -> str:
    # Clic en Acciones
    btn_acciones = wait.until(
        EC.element_to_be_clickable(
            (By.CSS_SELECTOR,
             "#kt_table_salesman_list tbody tr a[data-kt-menu-trigger='click']")
        )
    )
    driver.execute_script("arguments[0].scrollIntoView({block:'center'});", btn_acciones)
    driver.execute_script("arguments[0].click();", btn_acciones)

    # Esperar y clicar Editar
    btn_editar = wait.until(
        EC.visibility_of_element_located(
            (By.CSS_SELECTOR, "a[data-kt-salesman-table-register='edit_row']")
        )
    )
    id_vendedor = btn_editar.get_attribute("id")
    driver.execute_script("arguments[0].click();", btn_editar)

    # Esperar modal abierto
    wait.until(EC.visibility_of_element_located((By.ID, "kt_modal_register_salesman")))

    # Esperar que storeId tenga opciones Y que Select2 esté completamente inicializado.
    # Se busca dentro del modal para evitar capturar selects residuales del ciclo anterior.
    wait.until(
        lambda d: d.execute_script("""
            var modal = document.getElementById('kt_modal_register_salesman');
            if (!modal) return false;
            var sel = modal.querySelector("select[name='storeId']");
            if (!sel || sel.options.length <= 1) return false;
            return $(sel).data('select2') ? true : false;
        """)
    )

    return id_vendedor


# ======================================================
# VALIDAR Y LLENAR CAMPOS DEL MODAL (documento + activo)
# ======================================================
def llenar_documento(cedula: str) -> dict:
    """
    Retorna {'doc_accion': 'llenado'|'existia'|'sin_campo',
             'activo_accion': 'ya_activo'|'activado'|'sin_campo'}
    """
    return driver.execute_script("""
        var cedula  = arguments[0];
        var modal   = document.getElementById('kt_modal_register_salesman');
        var result  = {doc_accion: 'sin_campo', activo_accion: 'sin_campo'};
        if (!modal) return result;

        // --- Nro. de documento ---
        var inp = modal.querySelector("input[placeholder='Nro. de documento']");
        if (inp) {
            if (!inp.value.trim()) {
                // Quitar readonly/disabled para que FormValidation y la serialización lo lean
                inp.removeAttribute('readonly');
                inp.removeAttribute('disabled');

                // Native setter + solo los eventos mínimos que FormValidation necesita.
                // No disparar 'blur' — evita validación AJAX contra el servidor.
                var nativeSetter = Object.getOwnPropertyDescriptor(
                    HTMLInputElement.prototype, 'value').set;
                nativeSetter.call(inp, cedula);
                inp.dispatchEvent(new Event('input',  {bubbles: true}));
                inp.dispatchEvent(new Event('change', {bubbles: true}));

                result.doc_accion = 'llenado';
            } else {
                result.doc_accion = 'existia';
            }
        }

        // --- Campo hidden "active" (el que realmente se serializa en el submit) ---
        // El checkbox #chkOnlineHiddden es solo visual; el hidden input[name="active"]
        // es el que $.serialize() incluye en el payload.
        var hiddenActive = modal.querySelector("input[name='active'][type='hidden']");
        if (hiddenActive) {
            if (hiddenActive.value === '1') {
                result.activo_accion = 'ya_activo';
            } else {
                hiddenActive.value = '1';
                // Sincronizar también el checkbox visual
                var chk = document.getElementById('chkOnlineHiddden');
                if (chk) chk.checked = true;
                result.activo_accion = 'activado';
            }
        }

        return result;
    """, cedula)


# ==============================
# SELECCIONAR TIENDA (Select2 UI)
# ==============================
def seleccionar_tienda(tienda_csv: str):
    partes = tienda_csv.strip().split()
    codigo = partes[0] if partes and partes[0].isdigit() else tienda_csv.strip()

    # Buscar la opción en el select por value o por texto que comience con el código.
    # Usa jQuery .val().trigger('change') para que Select2 y FormValidation detecten el cambio.
    resultado = driver.execute_script("""
        var modal = document.getElementById('kt_modal_register_salesman');
        var sel   = modal ? modal.querySelector("select[name='storeId']")
                          : document.querySelector("select[name='storeId']");
        var code  = arguments[0];
        if (!sel) return {ok: false, msg: 'select no encontrado'};

        // ¿Ya está seleccionada?
        var cur = sel.options[sel.selectedIndex];
        if (cur && (cur.text.trim().indexOf(code) === 0 || cur.value === code)) {
            return {ok: true, ya: true, texto: cur.text.trim()};
        }

        // Recorrer opciones buscando por value exacto o texto que empiece con el código
        for (var i = 0; i < sel.options.length; i++) {
            var opt = sel.options[i];
            if (opt.value === code || opt.text.trim().indexOf(code) === 0) {
                // trigger('change') notifica FormValidation; select2:select notifica Select2
                $(sel).val(opt.value).trigger('change');
                $(sel).trigger({type: 'select2:select', params: {data: {id: opt.value, text: opt.text.trim()}}});
                return {ok: true, ya: false, texto: opt.text.trim()};
            }
        }

        return {ok: false, msg: 'tienda no encontrada: ' + code};
    """, codigo)

    if resultado.get("ya"):
        return None, True   # (texto, ya_correcta)

    if resultado.get("ok"):
        return resultado["texto"], False

    return "", False


# ==============================
# BARRA DE PROGRESO — CONSOLA
# ==============================
def mostrar_progreso(actual: int, total: int, estado: str):
    iconos = {
        "GUARDADO"            : "✅",
        "YA_CORRECTA"         : "ℹ️ ",
        "NO_ENCONTRADO"       : "❌",
        "TIENDA_NO_ENCONTRADA": "❌",
        "ERROR_GUARDADO"      : "⚠️ ",
        "ERROR"               : "⚠️ ",
        "SIN_EMAIL"           : "⚠️ ",
    }
    icono = iconos.get(estado, "·")
    pct   = actual / total
    lleno = int(pct * 40)
    barra = "█" * lleno + "░" * (40 - lleno)
    print(f"  [{barra}] {actual:>3}/{total} ({pct:>5.1%})  {icono} {estado}")


# ==============================
# BARRA DE PROGRESO — NAVEGADOR
# ==============================
def crear_widget_progreso(total: int):
    driver.execute_script("""
        if (document.getElementById('__tp_widget__')) return;
        var w = document.createElement('div');
        w.id = '__tp_widget__';
        w.innerHTML = `
            <div style="font-size:11px;color:#aaa;margin-bottom:6px;letter-spacing:.5px">
                TRASLADOS VENDEDOR
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                <div id="__tp_bar_wrap__" style="flex:1;height:8px;background:#2a2a2a;border-radius:4px;overflow:hidden">
                    <div id="__tp_bar__" style="height:100%;width:0%;background:#009ef7;border-radius:4px;transition:width .4s ease"></div>
                </div>
                <span id="__tp_pct__" style="font-size:12px;font-weight:700;color:#009ef7;min-width:36px;text-align:right">0%</span>
            </div>
            <div style="display:flex;justify-content:space-between;margin-bottom:10px">
                <span id="__tp_count__" style="font-size:12px;color:#ccc">0 / """ + str(total) + """</span>
                <span id="__tp_estado__" style="font-size:12px;font-weight:600;color:#aaa">—</span>
            </div>
            <div id="__tp_correo__" style="font-size:11px;color:#888;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:260px">
                Iniciando...
            </div>
            <div id="__tp_log__" style="margin-top:10px;max-height:120px;overflow-y:auto;font-size:10px;color:#888;line-height:1.6"></div>
        `;
        Object.assign(w.style, {
            position:     'fixed',
            bottom:       '20px',
            right:        '20px',
            zIndex:       '999999',
            background:   '#1e1e2d',
            border:       '1px solid #2a2a3a',
            borderRadius: '10px',
            padding:      '14px 16px',
            width:        '300px',
            boxShadow:    '0 4px 24px rgba(0,0,0,.5)',
            fontFamily:   'monospace',
        });
        document.body.appendChild(w);
    """, total)


def actualizar_widget_progreso(actual: int, total: int, correo: str, estado: str):
    colores = {
        "GUARDADO"            : "#50cd89",
        "YA_CORRECTA"         : "#009ef7",
        "NO_ENCONTRADO"       : "#f1416c",
        "TIENDA_NO_ENCONTRADA": "#f1416c",
        "ERROR_GUARDADO"      : "#ffc700",
        "ERROR"               : "#f1416c",
        "SIN_EMAIL"           : "#ffc700",
        "EN_PROCESO"          : "#009ef7",
    }
    color = colores.get(estado, "#aaa")
    driver.execute_script("""
        var pct    = Math.round(arguments[0] / arguments[1] * 100);
        var bar    = document.getElementById('__tp_bar__');
        var pctEl  = document.getElementById('__tp_pct__');
        var count  = document.getElementById('__tp_count__');
        var est    = document.getElementById('__tp_estado__');
        var correo = document.getElementById('__tp_correo__');
        var log    = document.getElementById('__tp_log__');
        if (!bar) return;
        bar.style.width      = pct + '%';
        pctEl.textContent    = pct + '%';
        pctEl.style.color    = arguments[4];
        count.textContent    = arguments[0] + ' / ' + arguments[1];
        est.textContent      = arguments[3];
        est.style.color      = arguments[4];
        correo.textContent   = arguments[2];
        if (arguments[3] !== 'EN_PROCESO') {
            var line = document.createElement('div');
            line.style.color = arguments[4];
            line.textContent = '[' + arguments[0] + '] ' + arguments[2] + ' → ' + arguments[3];
            log.appendChild(line);
            log.scrollTop = log.scrollHeight;
        }
    """, actual, total, correo, estado, color)


# ==============================
# GUARDAR CAMBIOS
# ==============================
def guardar_cambios() -> bool:
    wait.until(EC.presence_of_element_located((By.ID, "kt_salesman_details_submit")))

    driver.execute_script("""
        var btn = document.getElementById('kt_salesman_details_submit');
        btn.removeAttribute('disabled');
        btn.classList.remove('disabled');
        btn.scrollIntoView({block: 'center'});
        btn.click();
    """)

    # Esperar SweetAlert visible o navegación
    wait.until(lambda d:
        d.execute_script(
            "var p=document.querySelector('.swal2-popup');"
            "return p && p.offsetParent!==null;"
        ) or "salesman/register" in d.current_url
    )

    # Caso navegación
    if "salesman/register" in driver.current_url:
        body = driver.find_element(By.TAG_NAME, "body").text
        driver.back()
        wait.until(EC.presence_of_element_located((By.ID, "kt_table_salesman_list")))
        return '"success":true' in body or "correctamente" in body.lower()

    # Caso normal: SweetAlert visible
    popup = next(
        el for el in driver.find_elements(By.CSS_SELECTOR, ".swal2-popup")
        if el.is_displayed()
    )
    mensaje = popup.text.lower()

    confirmar = wait.until(
        EC.element_to_be_clickable((By.CSS_SELECTOR, "button.swal2-confirm"))
    )
    driver.execute_script("arguments[0].click();", confirmar)

    wait.until(lambda d: d.execute_script(
        "var p=document.querySelector('.swal2-popup');"
        "return !p || p.offsetParent===null;"
    ))

    if any(p in mensaje for p in ("correctamente", "guardaron", "exitoso", "éxito")):
        wait.until(EC.invisibility_of_element_located((By.ID, "kt_modal_register_salesman")))
        return True

    return False


# ==============================
# CERRAR MODAL
# ==============================
def cerrar_modal():
    try:
        btn = wait.until(
            EC.element_to_be_clickable(
                (By.CSS_SELECTOR, "[data-kt-salesman-modal-action='close']")
            )
        )
        driver.execute_script("arguments[0].click();", btn)
        wait.until(EC.invisibility_of_element_located((By.ID, "kt_modal_register_salesman")))
    except TimeoutException:
        pass




# ==============================
# MAIN
# ==============================
cfg = cargar_config()
driver.maximize_window()

login(cfg["USUARIO"], cfg["PASSWORD"])
ir_a_vendedor()

filas = cargar_csv()
total = len(filas)
print(f"Procesando {total} registros...\n{'─'*60}")

crear_widget_progreso(total)

for i, fila in enumerate(filas, 1):
    correo = fila.get("CORREO", "")
    nombre = fila.get("Nombre", "")
    cedula = fila.get("CEDULA", "")
    tienda = fila.get("TIENDA", "")
    estado = "ERROR"

    print(f"[{i:>2}/{total}] {correo}")
    try:
        actualizar_widget_progreso(i, total, correo or "(sin correo)", "EN_PROCESO")
    except Exception:
        pass

    resultado_previo = fila.get("RESULTADO", "")
    if resultado_previo in ("GUARDADO", "YA_CORRECTA"):
        estado = resultado_previo
        print(f"       ⏭️  ya procesado ({resultado_previo}) — omitido")

    elif not correo:
        print("       ⚠  Sin email — omitido")
        estado = "SIN_EMAIL"

    else:
        try:
            # 1. Buscar
            encontrado = buscar_vendedor(correo)
            print(f"       búsqueda : {'✅ encontrado' if encontrado else '❌ no encontrado'}")

            if not encontrado:
                estado = "NO_ENCONTRADO"
            else:
                # 2. Abrir modal
                id_vendedor = abrir_editar()
                print(f"       modal    : ✅ abierto  ID={id_vendedor}")

                # 2b. Validar documento + checkbox activo
                if cedula:
                    info = llenar_documento(cedula)
                    doc_msg = {
                        "llenado"   : f"✅ llenado ({cedula})",
                        "existia"   : "ℹ️  ya tenía valor",
                        "sin_campo" : "⚠️  campo no encontrado",
                    }.get(info.get("doc_accion", ""), "?")
                    act_msg = {
                        "ya_activo" : "ℹ️  ya estaba activo",
                        "activado"  : "✅ activado",
                        "sin_campo" : "⚠️  checkbox no encontrado",
                    }.get(info.get("activo_accion", ""), "?")
                    print(f"       cédula   : {doc_msg}")
                    print(f"       activo   : {act_msg}")

                # 3. Seleccionar tienda
                tienda_sel, ya_correcta = seleccionar_tienda(tienda)

                if ya_correcta:
                    estado = "YA_CORRECTA"
                    print(f"       tienda   : ℹ️  ya en tienda correcta")
                    cerrar_modal()

                elif not tienda_sel:
                    estado = "TIENDA_NO_ENCONTRADA"
                    print(f"       tienda   : ❌ no encontrada — {tienda}")
                    cerrar_modal()

                else:
                    print(f"       tienda   : ✅ {tienda_sel}")

                    # 4. Guardar
                    exito = guardar_cambios()
                    estado = "GUARDADO" if exito else "ERROR_GUARDADO"
                    print(f"       guardar  : {'✅' if exito else '❌'} {estado}")

                    try:
                        wait.until(EC.presence_of_element_located(
                            (By.ID, "kt_table_salesman_list")))
                    except TimeoutException:
                        pass

        except Exception as e:
            estado = "ERROR"
            print(f"       ❌ Error: {type(e).__name__}: {e}")
            print(traceback.format_exc())
            try:
                cerrar_modal()
            except Exception:
                pass

    # Persistir resultado en el CSV origen tras cada iteración
    fila["RESULTADO"] = estado
    guardar_csv_resultado(filas)

    try:
        actualizar_widget_progreso(i, total, correo or "(sin correo)", estado)
    except Exception:
        pass
    mostrar_progreso(i, total, estado)
    print(f"  {'─'*58}")

input("\nPresiona Enter para cerrar el navegador...")
driver.quit()
