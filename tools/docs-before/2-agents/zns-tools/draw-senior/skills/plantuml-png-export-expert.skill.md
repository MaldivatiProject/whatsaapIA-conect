# 🖼️ SKILL: PLANTUML PNG EXPORT EXPERT

**skill_id**: plantuml-png-export-expert  
**version**: 1.0.0  
**nivel**: Senior  
**categoria**: architecture / diagramming / export / tooling  
**last_updated**: 2026-04-17  
**autor**: Skill Engineer Senior ZNS  
**compatible_con**:
- `2-agents/zns-tools/draw-senior/prompt-draw-c4-deployment-senior.md`
- `2-agents/zns-tecnical-team/4.zns-architecture/2.definition_of_architecture/prompt-especialista-diagramacion-c4.md`
**dependencias**: `c4-model-diagram-expert.skill.md` (los `.puml` deben existir antes de exportar)

---

## 📌 Propósito de la Skill

Esta skill equipa al agente con el conocimiento completo para generar archivos **PNG de alta calidad (300 DPI)** a partir de los archivos `.puml` de PlantUML. Cubre tres métodos de exportación (CLI local, script batch automatizado y servidor PlantUML online), las flags de calidad obligatorias, la convención de nomenclatura de archivos de salida, las instrucciones de generación de script batch multiplataforma y los criterios de validación de calidad del PNG resultante. El PNG es el formato de entrega final para documentación, Confluence, Notion, presentaciones y pull requests.

---

## 🧠 Conocimiento Núcleo

---

### 1️⃣ Método Principal: CLI PlantUML con Flags de Calidad

El comando canónico para exportar **un solo diagrama** a PNG de alta calidad:

```bash
# Sintaxis base
plantuml -tpng -Sdpi=300 -charset UTF-8 <archivo.puml>

# Ejemplo con ruta relativa
plantuml -tpng -Sdpi=300 -charset UTF-8 diagrams/c4-l1-context.puml
# → genera: diagrams/c4-l1-context.png

# Ejemplo con output en carpeta separada
plantuml -tpng -Sdpi=300 -charset UTF-8 -o ./diagrams/png diagrams/c4-l1-context.puml
# → genera: diagrams/png/c4-l1-context.png
```

**Flags obligatorias — explicación**:

| Flag | Valor | Por qué es obligatoria |
|------|-------|------------------------|
| `-tpng` | — | Especifica formato de salida PNG (por defecto es PNG, pero declararlo evita ambigüedades) |
| `-Sdpi=300` | `300` | 300 DPI — calidad de impresión. Sin esto PlantUML genera 72 DPI (baja resolución) |
| `-charset UTF-8` | `UTF-8` | Asegura renderizado correcto de tildes, ñ y caracteres especiales en labels |

**Flags opcionales útiles**:

| Flag | Cuándo usar |
|------|-------------|
| `-o <carpeta>` | Separar PNGs de los fuentes `.puml` en una subcarpeta |
| `-DPLANTUML_LIMIT_SIZE=8192` | Si el diagrama es grande y PlantUML lo trunca (error: "Image dimensions exceeded") |
| `-Sskinparam=true` | Para aplicar un skinparam global desde línea de comandos |
| `-darkmode` | Para generar versión dark mode del diagrama |
| `-v` | Verbose — útil para depurar errores de renderizado |

---

### 2️⃣ Exportación Batch: Todos los Diagramas de Una Vez

#### En Linux / macOS (bash)

```bash
#!/bin/bash
# export-diagrams.sh — Exporta todos los .puml de la carpeta diagrams/ a PNG 300 DPI

set -e

DIAGRAMS_DIR="./diagrams"
OUTPUT_DIR="./diagrams/png"
DPI=300

echo "📐 Iniciando exportación de diagramas PlantUML → PNG ${DPI} DPI"
mkdir -p "$OUTPUT_DIR"

# Exportar todos los .puml
plantuml -tpng -Sdpi=${DPI} -charset UTF-8 -o "$(pwd)/${OUTPUT_DIR}" "${DIAGRAMS_DIR}"/*.puml

# Contar archivos generados
COUNT=$(ls -1 "${OUTPUT_DIR}"/*.png 2>/dev/null | wc -l)
echo "✅ ${COUNT} diagrama(s) exportado(s) en: ${OUTPUT_DIR}/"

# Listar archivos generados
ls -lh "${OUTPUT_DIR}"/*.png
```

#### En Windows (PowerShell)

```powershell
# export-diagrams.ps1 — Exporta todos los .puml de la carpeta diagrams/ a PNG 300 DPI

$DiagramsDir = ".\diagrams"
$OutputDir   = ".\diagrams\png"
$DPI         = 300

Write-Host "📐 Iniciando exportación de diagramas PlantUML → PNG $DPI DPI"
New-Item -ItemType Directory -Force -Path $OutputDir | Out-Null

# Exportar todos los .puml
$pumlFiles = Get-ChildItem -Path $DiagramsDir -Filter "*.puml" | Select-Object -ExpandProperty FullName

foreach ($file in $pumlFiles) {
    Write-Host "  → Exportando: $(Split-Path $file -Leaf)"
    plantuml -tpng "-Sdpi=$DPI" -charset UTF-8 -o (Resolve-Path $OutputDir).Path $file
}

# Resumen
$count = (Get-ChildItem -Path $OutputDir -Filter "*.png").Count
Write-Host "✅ $count diagrama(s) exportado(s) en: $OutputDir"
Get-ChildItem -Path $OutputDir -Filter "*.png" | Format-Table Name, Length -AutoSize
```

---

### 3️⃣ Método Alternativo: PlantUML Server Online (sin instalación local)

Útil cuando no hay PlantUML instalado localmente (CI/CD, entornos sin JVM, máquinas nuevas).

#### Generar URL de PlantUML Online

PlantUML codifica el diagrama en Base64 comprimido para construir una URL:

```bash
# Usando el CLI (requiere plantuml instalado solo para codificar, no para renderizar)
# El servidor online renderiza el PNG
URL=$(plantuml -encodeurl diagrams/c4-l1-context.puml)
echo "PNG URL: https://www.plantuml.com/plantuml/png/${URL}"

# Descargar el PNG directamente
curl -o diagrams/png/c4-l1-context.png "https://www.plantuml.com/plantuml/png/${URL}"
```

#### Con Python (sin instalar plantuml — solo para casos offline forzados)

```python
import zlib, base64, urllib.request, pathlib

def puml_to_png(puml_path: str, output_path: str) -> None:
    """Exporta un .puml a PNG usando el servidor PlantUML online."""
    content = pathlib.Path(puml_path).read_text(encoding="utf-8")
    compressed = zlib.compress(content.encode("utf-8"), 9)[2:-4]  # strip zlib header/trailer
    encoded = base64.b64encode(compressed).decode("ascii")
    # PlantUML usa su propio alfabeto Base64
    transl = str.maketrans(
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
        "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-_"
    )
    puml_encoded = encoded.translate(transl)
    url = f"https://www.plantuml.com/plantuml/png/{puml_encoded}"
    urllib.request.urlretrieve(url, output_path)
    print(f"✅ PNG guardado en: {output_path}")

# Uso
puml_to_png("diagrams/c4-l1-context.puml", "diagrams/png/c4-l1-context.png")
```

> ⚠️ El servidor online tiene límite de tamaño (~8 KB de fuente). Para diagramas grandes usar CLI local.

---

### 4️⃣ Convención de Nomenclatura de Archivos PNG

Los PNG deben tener el **mismo nombre base** que su `.puml` de origen:

```
diagrams/
├── c4-l1-context.puml              ← Fuente
├── c4-l2-container.puml
├── c4-l3-identity-svc.puml
├── deploy-prod.puml
├── deploy-staging.puml
└── png/                            ← Carpeta de salida PNG
    ├── c4-l1-context.png           ← Mismo nombre, extensión .png
    ├── c4-l2-container.png
    ├── c4-l3-identity-svc.png
    ├── deploy-prod.png
    └── deploy-staging.png
```

**Regla**: El directorio `diagrams/png/` contiene **solo artefactos generados** (no fuentes). Se puede regenerar en cualquier momento desde los `.puml`. En Git, los `.png` pueden estar en `.gitignore` o versionarse según preferencia del equipo (ver Sección 6).

---

### 5️⃣ Validación de Calidad del PNG Generado

Antes de entregar un PNG, verificar:

```markdown
## ✅ Checklist de Calidad — PNG Exportado

### Resolución y Claridad:
- [ ] DPI ≥ 300 (verificar con: `identify -verbose archivo.png | grep Resolution`)
- [ ] Texto de todos los labels legible sin zoom en pantalla 1080p
- [ ] Sin artefactos de compresión ni pixelado visible
- [ ] Dimensiones mínimas: 1200px de ancho para L1/L2, 1600px para L3/Deployment

### Contenido:
- [ ] El diagrama completo es visible (sin truncamiento en bordes)
- [ ] Leyenda visible e incluida (resultado de LAYOUT_WITH_LEGEND())
- [ ] Título del diagrama visible en el PNG
- [ ] Todos los labels de relaciones legibles

### Caracteres:
- [ ] Tildes y ñ renderizadas correctamente (flag -charset UTF-8)
- [ ] Sin caracteres de reemplazo (□, ?, â€™, etc.)

### Fondo:
- [ ] Fondo blanco (por defecto PlantUML) — no transparente para documentación embebida
```

#### Comando para verificar DPI (requiere ImageMagick):

```bash
# macOS / Linux
identify -verbose diagrams/png/c4-l1-context.png | grep -i "resolution\|geometry"

# Salida esperada:
# Geometry: 2480x1754+0+0   (A4 a 300 DPI aprox.)
# Resolution: 300x300
# Units: PixelsPerInch

# Windows (PowerShell) — usando magick (ImageMagick)
magick identify -verbose .\diagrams\png\c4-l1-context.png | Select-String "Resolution|Geometry"
```

---

### 6️⃣ Git: Qué Versionar y Qué Ignorar

#### Política ZNS para control de versiones de diagramas

```gitignore
# .gitignore — sección diagramas

# ✅ SIEMPRE versionar (fuentes de verdad)
# diagrams/*.puml  ← no ignorar

# ❓ DECISIÓN POR EQUIPO: PNGs de salida
# Opción A: Ignorar PNGs (se regeneran en CI/CD)
diagrams/png/

# Opción B: Versionar PNGs (útil si no todos tienen PlantUML instalado)
# diagrams/png/*.png  ← no ignorar (eliminar la línea de arriba)
```

#### Recomendación ZNS

| Contexto | Estrategia | Justificación |
|----------|------------|---------------|
| Equipo con PlantUML instalado / CI/CD configurado | Ignorar PNGs en Git | Los `.puml` son la fuente de verdad, menor tamaño de repo |
| Documentación que se comparte externamente (Confluence, Wiki) | Versionar PNGs | Facilita acceso sin instalación de herramientas |
| Pull Requests / Code Review | Siempre versionar | Los revisores necesitan ver el PNG sin instalar nada |

---

### 7️⃣ Integración en CI/CD (GitHub Actions)

Para que los PNGs se generen automáticamente en cada push:

```yaml
# .github/workflows/generate-diagrams.yml
name: Generate Architecture Diagrams

on:
  push:
    paths:
      - 'diagrams/**/*.puml'
  pull_request:
    paths:
      - 'diagrams/**/*.puml'

jobs:
  generate-png:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Install PlantUML
        run: |
          sudo apt-get update -qq
          sudo apt-get install -y plantuml graphviz default-jre-headless

      - name: Generate PNGs (300 DPI)
        run: |
          mkdir -p diagrams/png
          plantuml -tpng -Sdpi=300 -charset UTF-8 -o "$(pwd)/diagrams/png" diagrams/*.puml
          echo "✅ Diagramas generados:"
          ls -lh diagrams/png/

      - name: Upload PNGs as artifacts
        uses: actions/upload-artifact@v4
        with:
          name: architecture-diagrams-png
          path: diagrams/png/
          retention-days: 30

      # Opcional: Commit automático de los PNGs al repo
      - name: Commit generated PNGs
        if: github.event_name == 'push'
        run: |
          git config --local user.email "ci@zns-method.com"
          git config --local user.name "ZNS CI Bot"
          git add diagrams/png/*.png
          git diff --staged --quiet || git commit -m "ci(diagrams): regenera PNGs desde .puml [skip ci]"
          git push
```

---

## ✅ Criterios de Aplicación

- Siempre que se hayan generado archivos `.puml` y se necesiten PNGs para documentación, Confluence, Notion o presentaciones
- Al final de cualquier ciclo de diagramación (después de generar/actualizar los `.puml`)
- En pipelines CI/CD donde los diagramas deben estar disponibles como artefactos

## ❌ Anti-patrones — NUNCA Hacer

| Anti-patrón | Problema | Solución |
|-------------|----------|----------|
| **Exportar sin `-Sdpi=300`** | PNG borroso en pantallas retina y en impresión | Siempre incluir la flag DPI |
| **Omitir `-charset UTF-8`** | Tildes y caracteres especiales se corrompen | Siempre incluir charset |
| **Editar el PNG directamente** | El PNG es un artefacto generado, no la fuente | Editar el `.puml` y regenerar |
| **Entregar PNG sin el `.puml` de origen** | No se puede actualizar el diagrama después | El `.puml` debe estar en el repo |
| **Usar el PNG de la preview de VSCode** | Baja resolución (72 DPI), no apto para documentación | Siempre exportar con CLI |
| **Guardar PNGs en el mismo directorio que los `.puml`** | Mezcla fuentes con artefactos, dificulta CI/CD | Siempre usar subcarpeta `png/` |

---

## 📝 Ejemplo Completo: Flujo de Exportación

### Escenario: Se acaban de generar 5 diagramas PlantUML para el sistema MI-TOGA

**Estructura de partida:**
```
diagrams/
├── c4-l1-context.puml
├── c4-l2-container.puml
├── c4-l3-identity-svc.puml
├── deploy-prod.puml
└── deploy-staging.puml
```

**Paso 1**: Verificar que PlantUML está instalado
```bash
plantuml -version
# PlantUML version 1.2024.8 (Sat Oct 12 14:32:11 UTC 2024)
```

**Paso 2**: Crear carpeta de salida y exportar batch
```bash
# Linux / macOS
mkdir -p diagrams/png
plantuml -tpng -Sdpi=300 -charset UTF-8 -o "$(pwd)/diagrams/png" diagrams/*.puml

# Windows (PowerShell)
New-Item -ItemType Directory -Force -Path .\diagrams\png | Out-Null
plantuml -tpng -Sdpi=300 -charset UTF-8 -o (Resolve-Path .\diagrams\png).Path .\diagrams\*.puml
```

**Paso 3**: Verificar resultado
```bash
ls -lh diagrams/png/
# -rw-r--r-- 1 user staff 245K c4-l1-context.png
# -rw-r--r-- 1 user staff 412K c4-l2-container.png
# -rw-r--r-- 1 user staff 389K c4-l3-identity-svc.png
# -rw-r--r-- 1 user staff 521K deploy-prod.png
# -rw-r--r-- 1 user staff 298K deploy-staging.png
```

**Paso 4**: Validar calidad de un diagrama
```bash
identify -verbose diagrams/png/deploy-prod.png | grep -i "resolution\|geometry"
# Geometry: 3508x2480+0+0
# Resolution: 300x300
# Units: PixelsPerInch
```

**Estructura final:**
```
diagrams/
├── c4-l1-context.puml           ← Fuente (versionar siempre)
├── c4-l2-container.puml
├── c4-l3-identity-svc.puml
├── deploy-prod.puml
├── deploy-staging.puml
└── png/                         ← Artefactos generados
    ├── c4-l1-context.png        ← 300 DPI ✅
    ├── c4-l2-container.png
    ├── c4-l3-identity-svc.png
    ├── deploy-prod.png
    └── deploy-staging.png
```

---

## 📊 Métricas de Calidad

| Métrica | Umbral ZNS |
|---------|------------|
| DPI de exportación | ≥ 300 DPI obligatorio |
| Diagramas con tildes/ñ corruptas | 0% |
| Diagramas truncados en bordes | 0% |
| Tiempo de exportación batch (5 diagramas) | ≤ 60 segundos en máquina local |
| PNGs entregados sin su `.puml` de origen | 0% |

---

## 🔗 Instrucciones de Inyección en Agentes

Para incorporar esta skill en un agente, agregar:

```markdown
### SKILL ACTIVA: PLANTUML PNG EXPORT EXPERT → ver: 2-agents/zns-tools/draw-senior/skills/plantuml-png-export-expert.skill.md

**Reglas no negociables:**
- Exportar siempre con: `plantuml -tpng -Sdpi=300 -charset UTF-8`
- Los PNGs van en subcarpeta `diagrams/png/` — NUNCA mezclados con los `.puml`
- El `.puml` es la fuente de verdad — los PNGs son artefactos regenerables
- Batch export: un solo comando para exportar todos los `.puml` de la carpeta
- DPI mínimo: 300 — cualquier PNG de menor resolución es inaceptable para documentación
- Siempre verificar que tildes y ñ estén correctas tras exportar (flag -charset UTF-8)
```

---

## 🔄 Changelog

- v1.0.0: Versión inicial — PlantUML PNG Export Expert con CLI, batch scripts, servidor online, integración CI/CD, checklist de calidad y anti-patrones
