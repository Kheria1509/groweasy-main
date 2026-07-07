import Papa from "papaparse";
import { RawRecord } from "../types/crm";
import { BadRequestError } from "../utils/errors";

export interface ParsedCsv {
  /** Header column names detected in the file. */
  headers: string[];
  /** Rows keyed by header name; empty/whitespace cells are omitted. */
  rows: RawRecord[];
}

/**
 * Parses a CSV buffer into structured rows without assuming any fixed schema.
 *
 * Uses PapaParse with header detection and dynamic typing disabled so every
 * value stays a string (the AI reasons better over raw text, and we avoid
 * accidental numeric coercion of things like phone numbers).
 */
export function parseCsv(buffer: Buffer): ParsedCsv {
  const text = buffer.toString("utf-8").replace(/^\uFEFF/, ""); // strip BOM

  if (text.trim() === "") {
    throw new BadRequestError("The uploaded CSV file is empty.");
  }

  const result = Papa.parse<Record<string, unknown>>(text, {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (header) => header.trim(),
    dynamicTyping: false,
  });

  const headers = (result.meta.fields ?? []).filter((h) => h.trim() !== "");
  if (headers.length === 0) {
    throw new BadRequestError("Could not detect any columns in the CSV file.");
  }

  const rows: RawRecord[] = [];
  for (const rawRow of result.data) {
    const row: RawRecord = {};
    let hasValue = false;
    for (const header of headers) {
      const value = rawRow[header];
      if (value === null || value === undefined) continue;
      const str = String(value).trim();
      if (str !== "") {
        row[header] = str;
        hasValue = true;
      }
    }
    if (hasValue) rows.push(row);
  }

  if (rows.length === 0) {
    throw new BadRequestError("The CSV file does not contain any data rows.");
  }

  return { headers, rows };
}

/**
 * Splits an array into batches of a fixed size for incremental AI processing.
 */
export function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}
