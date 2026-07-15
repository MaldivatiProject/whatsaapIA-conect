"use client";

import { Fragment, useMemo, useState, type ReactNode } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { ReportExportActions } from "@/shared/components/data/ReportExportActions";
import { TablePagination } from "@/shared/components/layout/TablePagination";
import type { ExportCellValue, ExportTableColumn } from "@/shared/lib/export/tableExport";
import { cn } from "@/shared/lib/utils/cn";

type RowClassName<TData> = string | ((row: TData) => string | undefined);
type SortDirection = "asc" | "desc";

export interface DataTableColumn<TData> {
  id: string;
  header: ReactNode;
  cell: (row: TData) => ReactNode;
  exportValue?: (row: TData) => ExportCellValue;
  sortValue?: (row: TData) => ExportCellValue;
  exportHeader?: string;
  exportable?: boolean;
  sortable?: boolean;
  align?: "left" | "right";
  pdfWidth?: number;
  headClassName?: string;
  cellClassName?: RowClassName<TData>;
  title?: string;
}

export interface DataTableExportConfig<TData> {
  title: string;
  filename: string;
  rows?: TData[];
  subtitle?: string;
  disabled?: boolean;
}

export interface DataTableSort {
  columnId: string;
  direction: SortDirection;
}

interface DataTableProps<TData> {
  columns: DataTableColumn<TData>[];
  rows: TData[];
  getRowKey: (row: TData) => string;
  emptyMessage: string;
  exportConfig?: DataTableExportConfig<TData>;
  defaultSort?: DataTableSort;
  pagination?: {
    pageSize?: number;
  };
  className?: string;
  tableClassName?: string;
  exportClassName?: string;
  /**
   * Renders an inline detail panel below a row when it's expanded. Adds a
   * leading chevron column. Only one row is expanded at a time (accordion),
   * keyed by getRowKey — expansion survives sort/pagination automatically.
   */
  renderExpanded?: (row: TData) => ReactNode;
  expandAriaLabel?: (row: TData) => string;
}

function resolveClassName<TData>(className: RowClassName<TData> | undefined, row: TData) {
  return typeof className === "function" ? className(row) : className;
}

function exportHeader<TData>(column: DataTableColumn<TData>): string {
  if (column.exportHeader) return column.exportHeader;
  if (typeof column.header === "string") return column.header;
  return column.id;
}

function exportColumns<TData>(columns: DataTableColumn<TData>[]): ExportTableColumn<TData>[] {
  return columns
    .filter((column) => column.exportable !== false && column.exportValue)
    .map((column) => ({
      header: exportHeader(column),
      value: column.exportValue as (row: TData) => ExportCellValue,
      align: column.align,
      width: column.pdfWidth,
    }));
}

function isColumnSortable<TData>(column: DataTableColumn<TData>): boolean {
  if (column.sortable !== undefined) return column.sortable;
  return column.exportable !== false && Boolean(column.sortValue ?? column.exportValue);
}

function sortableValue<TData>(column: DataTableColumn<TData>, row: TData): ExportCellValue {
  return column.sortValue?.(row) ?? column.exportValue?.(row);
}

function compareValues(left: ExportCellValue, right: ExportCellValue): number {
  if (left === null || left === undefined) return right === null || right === undefined ? 0 : 1;
  if (right === null || right === undefined) return -1;

  const leftValue = left instanceof Date ? left.getTime() : left;
  const rightValue = right instanceof Date ? right.getTime() : right;

  if (typeof leftValue === "number" && typeof rightValue === "number") {
    return leftValue - rightValue;
  }

  if (typeof leftValue === "boolean" && typeof rightValue === "boolean") {
    return Number(leftValue) - Number(rightValue);
  }

  return new Intl.Collator("es-CO", { numeric: true, sensitivity: "base" }).compare(
    String(leftValue),
    String(rightValue),
  );
}

function sortRows<TData>(
  rows: TData[],
  columns: DataTableColumn<TData>[],
  sort: DataTableSort | null,
): TData[] {
  if (!sort) return rows;
  const column = columns.find((item) => item.id === sort.columnId && isColumnSortable(item));
  if (!column) return rows;

  const direction = sort.direction === "asc" ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index }))
    .sort((left, right) => {
      const result =
        compareValues(sortableValue(column, left.row), sortableValue(column, right.row)) *
        direction;
      return result || left.index - right.index;
    })
    .map((item) => item.row);
}

export function DataTable<TData>({
  columns,
  rows,
  getRowKey,
  emptyMessage,
  exportConfig,
  defaultSort,
  pagination,
  className,
  tableClassName,
  exportClassName,
  renderExpanded,
  expandAriaLabel,
}: DataTableProps<TData>) {
  const [sort, setSort] = useState<DataTableSort | null>(defaultSort ?? null);
  const [page, setPage] = useState(1);
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const columnsForExport = exportColumns(columns);
  const sortedRows = useMemo(() => sortRows(rows, columns, sort), [columns, rows, sort]);
  const pageSize = pagination?.pageSize ?? 10;
  const pageCount = Math.max(1, Math.ceil(sortedRows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const visibleRows = pagination
    ? sortedRows.slice((safePage - 1) * pageSize, safePage * pageSize)
    : sortedRows;
  const exportRows = exportConfig?.rows ? sortRows(exportConfig.rows, columns, sort) : sortedRows;
  const columnCount = columns.length + (renderExpanded ? 1 : 0);

  function toggleExpanded(key: string) {
    setExpandedKey((current) => (current === key ? null : key));
  }

  function handleSort(column: DataTableColumn<TData>) {
    if (!isColumnSortable(column)) return;
    setSort((current) => {
      if (current?.columnId === column.id) {
        return {
          columnId: column.id,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { columnId: column.id, direction: "asc" };
    });
    setPage(1);
  }

  return (
    <div className={cn("w-full", className)}>
      {exportConfig && (
        <ReportExportActions
          title={exportConfig.title}
          filename={exportConfig.filename}
          subtitle={exportConfig.subtitle}
          columns={columnsForExport}
          rows={exportRows}
          disabled={exportConfig.disabled}
          className={cn("px-4 py-3", exportClassName)}
        />
      )}
      <Table className={tableClassName}>
        <TableHeader>
          <TableRow>
            {renderExpanded && (
              <TableHead className="w-10 px-2">
                <span className="sr-only">Expandir</span>
              </TableHead>
            )}
            {columns.map((column) => {
              const sortable = isColumnSortable(column);
              const isActive = sort?.columnId === column.id;
              const SortIcon = isActive
                ? sort.direction === "asc"
                  ? ArrowUp
                  : ArrowDown
                : ArrowUpDown;

              return (
                <TableHead
                  key={column.id}
                  title={column.title}
                  aria-sort={
                    isActive ? (sort.direction === "asc" ? "ascending" : "descending") : undefined
                  }
                  className={cn(column.align === "right" && "text-right", column.headClassName)}
                >
                  {sortable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleSort(column)}
                      className={cn(
                        "-ml-2.5 h-auto gap-1 px-2.5 py-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase hover:text-foreground",
                        column.align === "right" && "ml-auto -mr-2.5",
                      )}
                      aria-label={`Ordenar por ${exportHeader(column)}`}
                    >
                      {column.header}
                      <SortIcon className="h-3.5 w-3.5" aria-hidden="true" />
                    </Button>
                  ) : (
                    column.header
                  )}
                </TableHead>
              );
            })}
          </TableRow>
        </TableHeader>
        <TableBody>
          {visibleRows.length > 0 ? (
            visibleRows.map((row) => {
              const key = getRowKey(row);
              const isExpanded = renderExpanded !== undefined && expandedKey === key;
              const detailId = `${key}-detail`;
              return (
                <Fragment key={key}>
                  <TableRow>
                    {renderExpanded && (
                      <TableCell className="px-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          aria-expanded={isExpanded}
                          aria-controls={detailId}
                          aria-label={expandAriaLabel?.(row) ?? "Ver detalle"}
                          onClick={() => toggleExpanded(key)}
                        >
                          <ChevronRight
                            className={cn("h-4 w-4 transition-transform", isExpanded && "rotate-90")}
                            aria-hidden="true"
                          />
                        </Button>
                      </TableCell>
                    )}
                    {columns.map((column) => (
                      <TableCell
                        key={column.id}
                        className={cn(
                          column.align === "right" && "text-right",
                          resolveClassName(column.cellClassName, row),
                        )}
                      >
                        {column.cell(row)}
                      </TableCell>
                    ))}
                  </TableRow>
                  {isExpanded && renderExpanded && (
                    <TableRow id={detailId} data-state="selected">
                      <TableCell colSpan={columnCount} className="bg-muted/30 p-0 whitespace-normal">
                        {renderExpanded(row)}
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={columnCount} className="py-8 text-center text-muted-foreground">
                {emptyMessage}
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {pagination && sortedRows.length > 0 && (
        <TablePagination
          page={safePage}
          pageCount={pageCount}
          totalItems={sortedRows.length}
          pageSize={pageSize}
          onPageChange={(nextPage) => setPage(Math.min(Math.max(1, nextPage), pageCount))}
        />
      )}
    </div>
  );
}
