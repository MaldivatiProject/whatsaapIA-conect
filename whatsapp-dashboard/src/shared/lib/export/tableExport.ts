"use client";

export type ExportCellValue = string | number | boolean | Date | null | undefined;

export interface ExportTableColumn<TData> {
  header: string;
  value: (row: TData) => ExportCellValue;
  align?: "left" | "right";
  width?: number;
}

export interface ExportTableOptions<TData> {
  title: string;
  filename: string;
  columns: ExportTableColumn<TData>[];
  rows: TData[];
  subtitle?: string;
  generatedAt?: Date;
}

const CSV_DELIMITER = ";";
const PDF_PAGE_WIDTH = 842;
const PDF_PAGE_HEIGHT = 595;
const PDF_MARGIN = 34;
const PDF_BODY_FONT_SIZE = 7.5;
const PDF_HEADER_FONT_SIZE = 8;

const WIN_ANSI_OVERRIDES: Record<string, number> = {
  "€": 128,
  "‚": 130,
  "ƒ": 131,
  "„": 132,
  "…": 133,
  "†": 134,
  "‡": 135,
  "ˆ": 136,
  "‰": 137,
  "Š": 138,
  "‹": 139,
  "Œ": 140,
  "Ž": 142,
  "‘": 145,
  "’": 146,
  "“": 147,
  "”": 148,
  "•": 149,
  "–": 150,
  "—": 151,
  "˜": 152,
  "™": 153,
  "š": 154,
  "›": 155,
  "œ": 156,
  "ž": 158,
  "Ÿ": 159,
};

function formatExportValue(value: ExportCellValue): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "boolean") return value ? "Sí" : "No";
  return String(value);
}

function ensureExtension(filename: string, extension: string): string {
  const cleanFilename = filename.trim() || "reporte";
  return cleanFilename.toLowerCase().endsWith(`.${extension}`)
    ? cleanFilename
    : `${cleanFilename}.${extension}`;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function escapeCsvCell(value: string): string {
  const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
  if (
    safeValue.includes(CSV_DELIMITER) ||
    safeValue.includes("\"") ||
    safeValue.includes("\n") ||
    safeValue.includes("\r")
  ) {
    return `"${safeValue.replaceAll("\"", "\"\"")}"`;
  }
  return safeValue;
}

export function exportTableToCsv<TData>(options: ExportTableOptions<TData>) {
  const lines = [
    options.columns.map((column) => escapeCsvCell(column.header)).join(CSV_DELIMITER),
    ...options.rows.map((row) =>
      options.columns
        .map((column) => escapeCsvCell(formatExportValue(column.value(row))))
        .join(CSV_DELIMITER),
    ),
  ];
  const csv = `\uFEFF${lines.join("\r\n")}`;
  downloadBlob(
    new Blob([csv], { type: "text/csv;charset=utf-8" }),
    ensureExtension(options.filename, "csv"),
  );
}

function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

function toPdfTextHex(value: string): string {
  const bytes: number[] = [];
  for (const char of value) {
    const override = WIN_ANSI_OVERRIDES[char];
    const codePoint = char.codePointAt(0) ?? 63;
    if (override !== undefined) {
      bytes.push(override);
    } else if (codePoint >= 32 && codePoint <= 255) {
      bytes.push(codePoint);
    } else if (codePoint === 9 || codePoint === 10 || codePoint === 13) {
      bytes.push(32);
    } else {
      bytes.push(63);
    }
  }
  return `<${bytes.map((byte) => byte.toString(16).padStart(2, "0")).join("")}>`;
}

function pdfNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function estimateTextWidth(text: string, fontSize: number): number {
  return text.length * fontSize * 0.48;
}

function wrapText(text: string, maxWidth: number, fontSize: number, maxLines = 3): string[] {
  const normalized = text.replace(/\s+/g, " ").trim() || " ";
  const words = normalized.split(" ");
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (estimateTextWidth(candidate, fontSize) <= maxWidth) {
      current = candidate;
      continue;
    }

    if (current) {
      lines.push(current);
      current = "";
    }

    if (estimateTextWidth(word, fontSize) <= maxWidth) {
      current = word;
      continue;
    }

    let chunk = "";
    for (const char of word) {
      const candidateChunk = `${chunk}${char}`;
      if (estimateTextWidth(candidateChunk, fontSize) <= maxWidth) {
        chunk = candidateChunk;
      } else {
        if (chunk) lines.push(chunk);
        chunk = char;
      }
    }
    current = chunk;

    if (lines.length >= maxLines) break;
  }

  if (current && lines.length < maxLines) lines.push(current);
  if (lines.length > maxLines) lines.length = maxLines;
  if (lines.length === maxLines && words.join(" ") !== lines.join(" ")) {
    const lastLine = lines[lines.length - 1] ?? "";
    lines[lines.length - 1] =
      lastLine.length > 3 ? `${lastLine.slice(0, Math.max(0, lastLine.length - 3))}...` : "...";
  }
  return lines;
}

function resolveColumnWidths<TData>(
  columns: ExportTableColumn<TData>[],
  availableWidth: number,
): number[] {
  const fixedWidth = columns.reduce((sum, column) => sum + (column.width ?? 0), 0);
  const fluidColumns = columns.filter((column) => column.width === undefined).length;
  const remainingWidth = Math.max(0, availableWidth - fixedWidth);
  const fluidWidth = fluidColumns > 0 ? remainingWidth / fluidColumns : 0;
  const widths = columns.map((column) => column.width ?? fluidWidth);
  const totalWidth = widths.reduce((sum, width) => sum + width, 0);

  if (totalWidth <= availableWidth) return widths;
  const scale = availableWidth / totalWidth;
  return widths.map((width) => width * scale);
}

function buildPdf<TData>(options: ExportTableOptions<TData>): Uint8Array {
  const availableWidth = PDF_PAGE_WIDTH - PDF_MARGIN * 2;
  const widths = resolveColumnWidths(options.columns, availableWidth);
  const generatedAt = options.generatedAt ?? new Date();
  const rows = options.rows.map((row) =>
    options.columns.map((column) => formatExportValue(column.value(row))),
  );

  const pageStreams: string[] = [];
  let stream: string[] = [];
  let y = PDF_MARGIN;
  let pageNumber = 0;

  function drawRect(x: number, top: number, width: number, height: number, color: string) {
    stream.push(
      `${color} rg ${pdfNumber(x)} ${pdfNumber(PDF_PAGE_HEIGHT - top - height)} ${pdfNumber(width)} ${pdfNumber(height)} re f`,
    );
  }

  function drawStrokeRect(x: number, top: number, width: number, height: number, color = "0.82 0.84 0.88") {
    stream.push(
      `${color} RG ${pdfNumber(x)} ${pdfNumber(PDF_PAGE_HEIGHT - top - height)} ${pdfNumber(width)} ${pdfNumber(height)} re S`,
    );
  }

  function drawText(
    text: string,
    x: number,
    top: number,
    fontSize: number,
    color = "0.10 0.12 0.16",
  ) {
    const baseline = PDF_PAGE_HEIGHT - top - fontSize;
    stream.push(
      `BT /F1 ${pdfNumber(fontSize)} Tf ${color} rg 1 0 0 1 ${pdfNumber(x)} ${pdfNumber(baseline)} Tm ${toPdfTextHex(text)} Tj ET`,
    );
  }

  function drawHeader() {
    const headerHeight = 24;
    drawRect(PDF_MARGIN, y, availableWidth, headerHeight, "0.94 0.95 0.97");
    drawStrokeRect(PDF_MARGIN, y, availableWidth, headerHeight);
    let x = PDF_MARGIN;
    options.columns.forEach((column, index) => {
      drawText(column.header, x + 5, y + 8, PDF_HEADER_FONT_SIZE, "0.31 0.36 0.43");
      x += widths[index] ?? 0;
    });
    y += headerHeight;
  }

  function finishPage() {
    drawText(`Página ${pageNumber}`, PDF_MARGIN, PDF_PAGE_HEIGHT - 28, 8, "0.45 0.49 0.56");
    pageStreams.push(stream.join("\n"));
  }

  function startPage() {
    if (stream.length > 0) finishPage();
    pageNumber += 1;
    stream = [];
    y = PDF_MARGIN;
    drawText(options.title, PDF_MARGIN, y, 15, "0.08 0.10 0.14");
    y += 18;
    if (options.subtitle) {
      drawText(options.subtitle, PDF_MARGIN, y, 9, "0.38 0.42 0.49");
      y += 12;
    }
    drawText(
      `Generado: ${generatedAt.toLocaleString("es-CO")}`,
      PDF_MARGIN,
      y,
      8,
      "0.45 0.49 0.56",
    );
    y += 18;
    drawHeader();
  }

  startPage();

  if (rows.length === 0) {
    const emptyHeight = 26;
    drawStrokeRect(PDF_MARGIN, y, availableWidth, emptyHeight);
    drawText("Sin datos para exportar.", PDF_MARGIN + 6, y + 8, PDF_BODY_FONT_SIZE, "0.45 0.49 0.56");
  } else {
    rows.forEach((row) => {
      const cellLines = row.map((cell, index) =>
        wrapText(cell, Math.max(24, (widths[index] ?? 0) - 10), PDF_BODY_FONT_SIZE),
      );
      const lineCount = Math.max(...cellLines.map((lines) => lines.length));
      const rowHeight = Math.max(22, lineCount * 9 + 10);

      if (y + rowHeight > PDF_PAGE_HEIGHT - PDF_MARGIN - 20) {
        startPage();
      }

      drawStrokeRect(PDF_MARGIN, y, availableWidth, rowHeight, "0.88 0.89 0.92");
      let x = PDF_MARGIN;
      cellLines.forEach((lines, index) => {
        const column = options.columns[index];
        const columnWidth = widths[index] ?? 0;
        const textLeft =
          column?.align === "right"
            ? x + columnWidth - Math.min(estimateTextWidth(lines[0] ?? "", PDF_BODY_FONT_SIZE), columnWidth - 10) - 5
            : x + 5;
        lines.forEach((line, lineIndex) => {
          drawText(line, textLeft, y + 7 + lineIndex * 9, PDF_BODY_FONT_SIZE);
        });
        x += columnWidth;
      });
      y += rowHeight;
    });
  }

  finishPage();

  const objects: string[] = [];
  const addObject = (content: string) => {
    objects.push(content);
    return objects.length;
  };

  const fontObjectId = addObject(
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  );

  const pageObjectIds = pageStreams.map((pageStream) => {
    const contentObjectId = addObject(
      `<< /Length ${byteLength(pageStream)} >>\nstream\n${pageStream}\nendstream`,
    );
    return addObject(
      `<< /Type /Page /Parent PAGES_REF /MediaBox [0 0 ${PDF_PAGE_WIDTH} ${PDF_PAGE_HEIGHT}] /Resources << /Font << /F1 ${fontObjectId} 0 R >> >> /Contents ${contentObjectId} 0 R >>`,
    );
  });

  const pagesObjectId = addObject(
    `<< /Type /Pages /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${pageObjectIds.length} >>`,
  );
  const catalogObjectId = addObject(`<< /Type /Catalog /Pages ${pagesObjectId} 0 R >>`);
  const resolvedObjects = objects.map((object) => object.replaceAll("PAGES_REF", `${pagesObjectId} 0 R`));

  const offsets = [0];
  let pdf = "%PDF-1.4\n";

  resolvedObjects.forEach((object, index) => {
    offsets[index + 1] = byteLength(pdf);
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });

  const xrefOffset = byteLength(pdf);
  pdf += `xref\n0 ${resolvedObjects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= resolvedObjects.length; index += 1) {
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${resolvedObjects.length + 1} /Root ${catalogObjectId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export function exportTableToPdf<TData>(options: ExportTableOptions<TData>) {
  const pdf = buildPdf(options);
  const pdfBuffer = new ArrayBuffer(pdf.byteLength);
  new Uint8Array(pdfBuffer).set(pdf);
  downloadBlob(new Blob([pdfBuffer], { type: "application/pdf" }), ensureExtension(options.filename, "pdf"));
}
