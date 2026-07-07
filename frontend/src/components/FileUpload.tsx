"use client";

import { useCallback, useRef, useState } from "react";
import { UploadCloudIcon } from "./icons";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  disabled?: boolean;
}

const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB, mirrors the backend limit.

/**
 * Drag & drop + file-picker CSV uploader with client-side validation for
 * file type and size before handing the file to the parent.
 */
export function FileUpload({ onFileSelected, disabled }: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateAndSelect = useCallback(
    (file: File | undefined) => {
      setError(null);
      if (!file) return;

      const isCsv =
        file.name.toLowerCase().endsWith(".csv") ||
        ["text/csv", "application/vnd.ms-excel", "application/csv"].includes(
          file.type,
        );
      if (!isCsv) {
        setError("Please upload a .csv file.");
        return;
      }
      if (file.size > MAX_SIZE_BYTES) {
        setError("File is too large. The maximum size is 10 MB.");
        return;
      }
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;
      validateAndSelect(e.dataTransfer.files?.[0]);
    },
    [disabled, validateAndSelect],
  );

  return (
    <div className="w-full">
      <div
        role="button"
        tabIndex={0}
        aria-disabled={disabled}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed px-6 py-14 text-center transition ${
          isDragging
            ? "border-brand-500 bg-brand-50 dark:bg-brand-900/20"
            : "border-slate-300 bg-white hover:border-brand-400 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500 dark:hover:bg-slate-800/60"
        } ${disabled ? "pointer-events-none opacity-60" : ""}`}
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-brand-100 text-brand-600 transition group-hover:scale-105 dark:bg-brand-900/40 dark:text-brand-300">
          <UploadCloudIcon className="h-8 w-8" />
        </div>
        <p className="text-lg font-semibold text-slate-800 dark:text-slate-100">
          Drag &amp; drop your CSV here
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          or <span className="font-medium text-brand-600 dark:text-brand-400">browse</span>{" "}
          to choose a file
        </p>
        <p className="mt-4 text-xs text-slate-400 dark:text-slate-500">
          Any CSV layout · up to 10 MB
        </p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => validateAndSelect(e.target.files?.[0])}
        />
      </div>
      {error && (
        <p className="mt-3 text-sm font-medium text-red-600 dark:text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
