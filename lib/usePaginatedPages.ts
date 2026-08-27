"use client";

import { useEffect, useState } from "react";
import { paginateRecord } from "./paginate";
import type { PageObject, RecordState } from "./types";

/**
 * Re-paginates whenever the record changes. Debounced slightly so rapid
 * typing doesn't trigger a synchronous DOM-measurement pass per keystroke.
 */
export function usePaginatedPages(record: RecordState, debounceMs = 80): PageObject[] {
  const [pages, setPages] = useState<PageObject[]>([]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setPages(paginateRecord(record));
    }, debounceMs);
    return () => window.clearTimeout(handle);
  }, [record, debounceMs]);

  return pages;
}
