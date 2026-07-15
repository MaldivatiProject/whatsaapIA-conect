"use client";

import { Download, FileText } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  exportTableToCsv,
  exportTableToPdf,
  type ExportTableColumn,
} from "@/shared/lib/export/tableExport";
import { cn } from "@/shared/lib/utils/cn";

interface ReportExportActionsProps<TData> {
  title: string;
  filename: string;
  columns: ExportTableColumn<TData>[];
  rows: TData[];
  subtitle?: string;
  disabled?: boolean;
  className?: string;
}

export function ReportExportActions<TData>({
  title,
  filename,
  columns,
  rows,
  subtitle,
  disabled = false,
  className,
}: ReportExportActionsProps<TData>) {
  const isDisabled = disabled || rows.length === 0 || columns.length === 0;
  const options = { title, filename, subtitle, columns, rows };

  return (
    <div className={cn("flex flex-wrap items-center justify-end gap-2", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={isDisabled}
        onClick={() => exportTableToCsv(options)}
        aria-label={`Exportar ${title} a CSV`}
      >
        <Download className="h-3.5 w-3.5" aria-hidden="true" />
        CSV
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-2"
        disabled={isDisabled}
        onClick={() => exportTableToPdf(options)}
        aria-label={`Exportar ${title} a PDF`}
      >
        <FileText className="h-3.5 w-3.5" aria-hidden="true" />
        PDF
      </Button>
    </div>
  );
}
