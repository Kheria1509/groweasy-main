"use client";

import { useState } from "react";
import { FIELD_LABELS, recordsToCsv } from "@/lib/api";
import {
  CRM_FIELDS,
  CrmRecord,
  ExtractionResult,
  SkippedRecord,
} from "@/lib/types";
import {
  AlertTriangleIcon,
  CheckCircleIcon,
  DownloadIcon,
  FileCsvIcon,
} from "./icons";
import { StatCard } from "./StatCard";
import { StatusBadge } from "./StatusBadge";
import { Column, VirtualizedTable } from "./VirtualizedTable";

interface ResultViewProps {
  result: ExtractionResult;
}

type Tab = "imported" | "skipped";

/** Renders the AI extraction outcome: summary stats + imported/skipped tables. */
export function ResultView({ result }: ResultViewProps) {
  const [tab, setTab] = useState<Tab>("imported");
  const hasSkipped = result.totalSkipped > 0;

  const handleDownload = () => {
    const csv = recordsToCsv(result.imported);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "groweasy-crm-leads.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <StatCard
          label="Imported"
          value={result.totalImported}
          tone="brand"
          icon={<CheckCircleIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Skipped"
          value={result.totalSkipped}
          tone="amber"
          icon={<AlertTriangleIcon className="h-5 w-5" />}
        />
        <StatCard
          label="Total Rows"
          value={result.totalRows}
          tone="sky"
          icon={<FileCsvIcon className="h-5 w-5" />}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-1 dark:border-slate-800 dark:bg-slate-800/60">
          <button
            type="button"
            onClick={() => setTab("imported")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === "imported"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Imported ({result.totalImported})
          </button>
          <button
            type="button"
            onClick={() => setTab("skipped")}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition ${
              tab === "skipped"
                ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }`}
          >
            Skipped ({result.totalSkipped})
          </button>
        </div>

        {result.totalImported > 0 && (
          <button
            type="button"
            onClick={handleDownload}
            className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
          >
            <DownloadIcon className="h-4 w-4" />
            Download CSV
          </button>
        )}
      </div>

      {tab === "imported" ? (
        <ImportedTable result={result} />
      ) : (
        <SkippedTable result={result} hasSkipped={hasSkipped} />
      )}
    </div>
  );
}

function ImportedTable({ result }: { result: ExtractionResult }) {
  if (result.totalImported === 0) {
    return (
      <EmptyState message="No records could be imported from this file." />
    );
  }
  const columns: Column<CrmRecord>[] = CRM_FIELDS.map((field) => ({
    key: field,
    header: FIELD_LABELS[field],
    width: field === "crm_note" || field === "description" ? 260 : 170,
    render: (record) =>
      field === "crm_status" ? (
        <StatusBadge value={record[field]} />
      ) : (
        (record[field] ?? "")
      ),
  }));

  return <VirtualizedTable columns={columns} rows={result.imported} maxHeight={520} />;
}

function SkippedTable({
  result,
  hasSkipped,
}: {
  result: ExtractionResult;
  hasSkipped: boolean;
}) {
  if (!hasSkipped) {
    return <EmptyState message="Great! No records were skipped." />;
  }
  const columns: Column<SkippedRecord>[] = [
    { key: "row", header: "Row", width: 80, render: (item) => String(item.row) },
    {
      key: "reason",
      header: "Reason",
      width: 320,
      render: (item) => (
        <span className="text-amber-700 dark:text-amber-300">{item.reason}</span>
      ),
    },
    {
      key: "data",
      header: "Original Data",
      width: 460,
      render: (item) => (
        <span className="font-mono text-xs text-slate-500 dark:text-slate-400">
          {JSON.stringify(item.data)}
        </span>
      ),
    },
  ];

  return (
    <VirtualizedTable
      columns={columns}
      rows={result.skipped}
      showRowNumber={false}
      maxHeight={520}
    />
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
      {message}
    </div>
  );
}
