"use client";

import { useCallback, useState } from "react";
import { FileUpload } from "@/components/FileUpload";
import { Header } from "@/components/Header";
import { PreviewTable } from "@/components/PreviewTable";
import { ProcessingIndicator } from "@/components/ProcessingIndicator";
import { ResultView } from "@/components/ResultView";
import { Stepper } from "@/components/Stepper";
import {
  AlertTriangleIcon,
  FileCsvIcon,
  RefreshIcon,
  SparklesIcon,
  XIcon,
} from "@/components/icons";
import { extractLeadsStream } from "@/lib/api";
import { formatBytes, parseCsvFile } from "@/lib/csv";
import { CsvPreview, ExtractionResult } from "@/lib/types";

type Stage = "upload" | "preview" | "processing" | "result";

interface Progress {
  percent: number;
  processedRows: number;
  batch: number;
  totalBatches: number;
}

export default function HomePage() {
  const [stage, setStage] = useState<Stage>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<CsvPreview | null>(null);
  const [result, setResult] = useState<ExtractionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<Progress | null>(null);

  const stepIndex =
    stage === "upload" ? 1 : stage === "preview" ? 2 : stage === "processing" ? 3 : 4;

  const handleFileSelected = useCallback(async (selected: File) => {
    setError(null);
    setFile(selected);
    try {
      const parsed = await parseCsvFile(selected);
      setPreview(parsed);
      setStage("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse the CSV file.");
      setFile(null);
    }
  }, []);

  const handleConfirm = useCallback(async () => {
    if (!file) return;
    setStage("processing");
    setError(null);
    setProgress(null);
    try {
      const extraction = await extractLeadsStream(file, {
        onMeta: (m) => {
          // Switch to real (determinate/indeterminate) progress immediately so
          // the bar never shows a fake climb that would jump backwards later.
          setProgress({
            percent: 0,
            processedRows: 0,
            batch: 0,
            totalBatches: m.totalBatches,
          });
        },
        onBatch: (p) => {
          setProgress({
            percent:
              p.totalRows > 0
                ? Math.round((p.processedRows / p.totalRows) * 100)
                : 0,
            processedRows: p.processedRows,
            batch: p.batch,
            totalBatches: p.totalBatches,
          });
        },
      });
      setResult(extraction);
      setStage("result");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "AI extraction failed. Please try again.",
      );
      setStage("preview");
    }
  }, [file]);

  const reset = useCallback(() => {
    setStage("upload");
    setFile(null);
    setPreview(null);
    setResult(null);
    setError(null);
    setProgress(null);
  }, []);

  return (
    <div className="min-h-screen">
      <Header />

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <section className="mx-auto mb-10 max-w-2xl text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 dark:bg-brand-900/40 dark:text-brand-300">
            <SparklesIcon className="h-3.5 w-3.5" />
            Powered by Gemini
          </span>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-4xl">
            Turn any CSV into clean CRM leads
          </h1>
          <p className="mt-3 text-slate-600 dark:text-slate-400">
            Upload a CSV in any format — Facebook, Google Ads, real-estate exports or a
            manual sheet. Our AI maps the columns to the GrowEasy CRM schema for you.
          </p>
        </section>

        <div className="mb-10">
          <Stepper current={stepIndex} />
        </div>

        {error && (
          <div className="mx-auto mb-6 flex max-w-2xl items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-900/20 dark:text-red-300">
            <AlertTriangleIcon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1">{error}</p>
            <button
              type="button"
              onClick={() => setError(null)}
              aria-label="Dismiss error"
              className="shrink-0 rounded p-0.5 hover:bg-red-100 dark:hover:bg-red-900/40"
            >
              <XIcon className="h-4 w-4" />
            </button>
          </div>
        )}

        {stage === "upload" && (
          <div className="mx-auto max-w-2xl animate-fade-in">
            <FileUpload onFileSelected={handleFileSelected} />
          </div>
        )}

        {stage === "preview" && preview && (
          <div className="animate-fade-in space-y-5">
            <FileSummary
              name={preview.fileName}
              size={preview.fileSize}
              rows={preview.rows.length}
              columns={preview.headers.length}
              onRemove={reset}
            />
            <PreviewTable headers={preview.headers} rows={preview.rows} />
            <div className="flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                Choose another file
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-brand-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-brand-700"
              >
                <SparklesIcon className="h-4 w-4" />
                Confirm &amp; Import with AI
              </button>
            </div>
          </div>
        )}

        {stage === "processing" && (
          <div className="mx-auto max-w-2xl">
            <ProcessingIndicator
              rowCount={preview?.rows.length ?? 0}
              progress={progress?.percent}
              processedRows={progress?.processedRows}
              batch={progress?.batch}
              totalBatches={progress?.totalBatches}
            />
          </div>
        )}

        {stage === "result" && result && (
          <div className="space-y-6">
            <ResultView result={result} />
            <div className="flex justify-center">
              <button
                type="button"
                onClick={reset}
                className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <RefreshIcon className="h-4 w-4" />
                Import another file
              </button>
            </div>
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-800 dark:text-slate-500">
        GrowEasy AI CSV Importer · Built with Next.js, Express &amp; Gemini
      </footer>
    </div>
  );
}

interface FileSummaryProps {
  name: string;
  size: number;
  rows: number;
  columns: number;
  onRemove: () => void;
}

function FileSummary({ name, size, rows, columns, onRemove }: FileSummaryProps) {
  return (
    <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600 dark:bg-brand-900/40 dark:text-brand-300">
        <FileCsvIcon className="h-6 w-6" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-slate-800 dark:text-slate-100">
          {name}
        </p>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          {formatBytes(size)} · {rows.toLocaleString()} rows · {columns} columns
        </p>
      </div>
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove file"
        className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      >
        <XIcon className="h-5 w-5" />
      </button>
    </div>
  );
}
