"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/shared/components/ui/button";

interface TablePaginationProps {
  page: number;
  pageCount: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function TablePagination({
  page,
  pageCount,
  totalItems,
  pageSize,
  onPageChange,
}: TablePaginationProps) {
  if (totalItems <= pageSize) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, totalItems);

  return (
    <nav
      aria-label="Paginación"
      className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground"
    >
      <span>
        {from}–{to} de {totalItems}
      </span>
      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="icon"
          aria-label="Página anterior"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </Button>
        <span className="px-2 tabular-nums" aria-current="page">
          {page} / {pageCount}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Página siguiente"
          disabled={page >= pageCount}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Button>
      </div>
    </nav>
  );
}
