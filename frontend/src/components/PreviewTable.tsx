"use client";

import { useMemo } from "react";
import { RawRecord } from "@/lib/types";
import { Column, VirtualizedTable } from "./VirtualizedTable";

interface PreviewTableProps {
  headers: string[];
  rows: RawRecord[];
}

/**
 * Responsive, virtualized preview of the raw uploaded CSV. Only the rows in
 * view are rendered, so it stays smooth even for very large files, with sticky
 * headers and horizontal + vertical scrolling.
 */
export function PreviewTable({ headers, rows }: PreviewTableProps) {
  const columns = useMemo<Column<RawRecord>[]>(
    () =>
      headers.map((header) => ({
        key: header,
        header,
        render: (row) => row[header] ?? "",
      })),
    [headers],
  );

  return <VirtualizedTable columns={columns} rows={rows} />;
}
