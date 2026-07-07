import Papa from "papaparse";
import { CsvPreview, RawRecord } from "./types";

/** Human-readable file size. */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Parses a CSV file entirely in the browser for the preview step.
 * No AI processing happens here — this is purely to show the raw upload.
 */
export function parseCsvFile(file: File): Promise<CsvPreview> {
  return new Promise((resolve, reject) => {
    Papa.parse<RawRecord>(file, {
      header: true,
      skipEmptyLines: "greedy",
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const headers = (results.meta.fields ?? []).filter((h) => h.trim() !== "");
        if (headers.length === 0) {
          reject(new Error("Could not detect any columns in this CSV file."));
          return;
        }

        const rows: RawRecord[] = [];
        for (const raw of results.data) {
          const row: RawRecord = {};
          let hasValue = false;
          for (const header of headers) {
            const value = raw[header];
            const str = value == null ? "" : String(value).trim();
            row[header] = str;
            if (str !== "") hasValue = true;
          }
          if (hasValue) rows.push(row);
        }

        if (rows.length === 0) {
          reject(new Error("This CSV file has no data rows."));
          return;
        }

        resolve({ headers, rows, fileName: file.name, fileSize: file.size });
      },
      error: (err) => reject(err),
    });
  });
}
