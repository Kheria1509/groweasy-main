"use client";

import { ReactNode, useCallback, useLayoutEffect, useRef, useState } from "react";

export interface Column<T> {
  key: string;
  header: string;
  /** Fixed column width in pixels (keeps layout stable while virtualizing). */
  width?: number;
  /** Optional custom cell renderer; defaults to the string value at `key`. */
  render?: (row: T, index: number) => ReactNode;
}

interface VirtualizedTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  /** Uniform row height in pixels (required for windowing). */
  rowHeight?: number;
  /** Max height of the scroll viewport in pixels. */
  maxHeight?: number;
  /** Show a sticky left-hand row-number column. */
  showRowNumber?: boolean;
  overscan?: number;
  emptyMessage?: string;
}

const DEFAULT_ROW_HEIGHT = 44;
const DEFAULT_MAX_HEIGHT = 480;
const DEFAULT_COL_WIDTH = 190;
const ROW_NUMBER_WIDTH = 64;

/**
 * A windowed (virtualized) table that renders only the rows currently in view,
 * so it stays smooth for very large CSVs. Column widths are fixed via a
 * <colgroup> so alignment never shifts as rows are recycled during scrolling.
 * Supports sticky headers, a sticky row-number column, and horizontal scroll.
 */
export function VirtualizedTable<T>({
  columns,
  rows,
  rowHeight = DEFAULT_ROW_HEIGHT,
  maxHeight = DEFAULT_MAX_HEIGHT,
  showRowNumber = true,
  overscan = 6,
  emptyMessage = "No rows to display.",
}: VirtualizedTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(maxHeight);

  const handleScroll = useCallback(() => {
    if (containerRef.current) setScrollTop(containerRef.current.scrollTop);
  }, []);

  useLayoutEffect(() => {
    if (containerRef.current) {
      setViewportHeight(containerRef.current.clientHeight || maxHeight);
    }
  }, [maxHeight, rows.length]);

  const totalHeight = rows.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - overscan);
  const visibleCount = Math.ceil(viewportHeight / rowHeight) + overscan * 2;
  const endIndex = Math.min(rows.length, startIndex + visibleCount);
  const topPad = startIndex * rowHeight;
  const bottomPad = Math.max(0, totalHeight - endIndex * rowHeight);

  const dataColSpan = columns.length + (showRowNumber ? 1 : 0);

  const rowNumberBase =
    "sticky left-0 z-10 border-b border-slate-100 bg-inherit px-4 font-mono text-xs text-slate-400 dark:border-slate-800";

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="scrollbar-thin overflow-auto"
        style={{ maxHeight }}
      >
        <table
          className="w-full border-collapse text-left text-sm"
          style={{ tableLayout: "fixed" }}
        >
          <colgroup>
            {showRowNumber && <col style={{ width: ROW_NUMBER_WIDTH }} />}
            {columns.map((col) => (
              <col key={col.key} style={{ width: col.width ?? DEFAULT_COL_WIDTH }} />
            ))}
          </colgroup>
          <thead className="sticky top-0 z-20">
            <tr className="bg-slate-100 dark:bg-slate-800">
              {showRowNumber && (
                <th
                  className="sticky left-0 z-30 border-b border-slate-200 bg-slate-100 px-4 py-3 font-semibold text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400"
                  style={{ height: rowHeight }}
                >
                  #
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="truncate border-b border-slate-200 px-4 py-3 font-semibold text-slate-700 dark:border-slate-700 dark:text-slate-200"
                  title={col.header}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={dataColSpan}
                  className="px-4 py-10 text-center text-slate-400 dark:text-slate-500"
                >
                  {emptyMessage}
                </td>
              </tr>
            )}
            {topPad > 0 && (
              <tr aria-hidden="true">
                <td colSpan={dataColSpan} style={{ height: topPad, padding: 0 }} />
              </tr>
            )}
            {rows.slice(startIndex, endIndex).map((row, i) => {
              const index = startIndex + i;
              return (
                <tr
                  key={index}
                  className="odd:bg-white even:bg-slate-50 hover:bg-brand-50/60 dark:odd:bg-slate-900 dark:even:bg-slate-800/40 dark:hover:bg-slate-800"
                  style={{ height: rowHeight }}
                >
                  {showRowNumber && (
                    <td className={rowNumberBase}>{index + 1}</td>
                  )}
                  {columns.map((col) => {
                    const content = col.render
                      ? col.render(row, index)
                      : ((row as Record<string, unknown>)[col.key] as ReactNode);
                    const isEmpty =
                      content === undefined || content === null || content === "";
                    return (
                      <td
                        key={col.key}
                        className="truncate border-b border-slate-100 px-4 text-slate-600 dark:border-slate-800 dark:text-slate-300"
                        title={typeof content === "string" ? content : undefined}
                      >
                        {isEmpty ? (
                          <span className="text-slate-300 dark:text-slate-600">—</span>
                        ) : (
                          content
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
            {bottomPad > 0 && (
              <tr aria-hidden="true">
                <td colSpan={dataColSpan} style={{ height: bottomPad, padding: 0 }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="border-t border-slate-100 px-4 py-2 text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        {rows.length.toLocaleString()} row{rows.length === 1 ? "" : "s"}
      </div>
    </div>
  );
}
