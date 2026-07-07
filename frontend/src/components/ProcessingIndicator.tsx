"use client";

import { useEffect, useState } from "react";
import { SparklesIcon } from "./icons";

interface ProcessingIndicatorProps {
  /** Approximate number of rows being processed, for messaging. */
  rowCount: number;
  /** Real progress percentage (0-100). When provided, the bar is determinate. */
  progress?: number;
  /** Cumulative rows processed so far (for a precise status line). */
  processedRows?: number;
  /** Current batch / total batches (for a precise status line). */
  batch?: number;
  totalBatches?: number;
}

const MESSAGES = [
  "Reading your columns…",
  "Understanding the layout…",
  "Mapping fields to CRM schema…",
  "Extracting leads with AI…",
  "Validating and cleaning records…",
  "Almost there…",
];

/**
 * Progress indicator shown while the backend runs AI extraction.
 *
 * When a real `progress` value is supplied (from the NDJSON stream), the bar is
 * determinate and reflects actual batch completion. Otherwise it falls back to
 * a smoothly-easing simulated bar so there is always visible feedback.
 */
export function ProcessingIndicator({
  rowCount,
  progress,
  processedRows,
  batch,
  totalBatches,
}: ProcessingIndicatorProps) {
  const isReal = typeof progress === "number";
  const [simulated, setSimulated] = useState(8);
  const [messageIndex, setMessageIndex] = useState(0);

  useEffect(() => {
    const messageTimer = setInterval(() => {
      setMessageIndex((i) => (i + 1) % MESSAGES.length);
    }, 2200);
    return () => clearInterval(messageTimer);
  }, []);

  useEffect(() => {
    if (isReal) return;
    const progressTimer = setInterval(() => {
      setSimulated((p) => (p >= 95 ? 95 : p + Math.max(0.5, (95 - p) * 0.08)));
    }, 400);
    return () => clearInterval(progressTimer);
  }, [isReal]);

  const width = isReal ? Math.min(100, Math.max(0, progress!)) : simulated;

  // Before the first batch completes we don't yet have a real percentage, so
  // show an indeterminate (looping) bar rather than a fake climbing one that
  // would jump backwards once the first real value arrives.
  const indeterminate = isReal && (!batch || batch < 1);

  const statusLine = indeterminate
    ? totalBatches
      ? `Preparing ${totalBatches} batch${totalBatches === 1 ? "" : "es"}…`
      : "Starting extraction…"
    : isReal && batch && totalBatches
      ? `Batch ${batch} of ${totalBatches}${
          processedRows
            ? ` · ${processedRows.toLocaleString()} of ${rowCount.toLocaleString()} rows`
            : ""
        }`
      : MESSAGES[messageIndex];

  return (
    <div className="animate-fade-in rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <SparklesIcon className="h-7 w-7 animate-pulse" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 dark:text-slate-100">
        Extracting CRM leads
      </h3>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Processing {rowCount.toLocaleString()} row{rowCount === 1 ? "" : "s"} in batches
      </p>

      <div className="mx-auto mt-6 max-w-md">
        <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
          {indeterminate ? (
            <div className="animate-indeterminate absolute inset-y-0 left-0 w-2/5 rounded-full bg-brand-500" />
          ) : (
            <div
              className="h-full rounded-full bg-brand-500 transition-all duration-500 ease-out"
              style={{ width: `${width}%` }}
            />
          )}
        </div>
        <div className="mt-3 flex items-center justify-between text-sm">
          <span className="font-medium text-brand-600 dark:text-brand-400">
            {statusLine}
          </span>
          {!indeterminate && (
            <span className="font-mono text-xs text-slate-400 dark:text-slate-500">
              {Math.round(width)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
