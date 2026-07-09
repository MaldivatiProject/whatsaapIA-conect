"use client";

import { useMemo, useState } from "react";

/** Client-side pagination over an already-fetched array. Resets to page 1 when the item count shrinks below the current page. */
export function usePagination<T>(items: T[], pageSize = 10) {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);

  const pageItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  return {
    page: safePage,
    setPage: (next: number) => setPage(Math.min(Math.max(1, next), pageCount)),
    pageCount,
    pageItems,
    totalItems: items.length,
    pageSize,
  };
}
