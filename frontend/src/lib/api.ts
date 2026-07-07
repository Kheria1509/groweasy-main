import { CRM_FIELDS, CrmRecord, ExtractionResult, SkippedRecord } from "./types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:4000";

/** Field labels for pretty table headers in the result view. */
export const FIELD_LABELS: Record<(typeof CRM_FIELDS)[number], string> = {
  created_at: "Created At",
  name: "Name",
  email: "Email",
  country_code: "Code",
  mobile_without_country_code: "Mobile",
  company: "Company",
  city: "City",
  state: "State",
  country: "Country",
  lead_owner: "Lead Owner",
  crm_status: "Status",
  crm_note: "Note",
  data_source: "Source",
  possession_time: "Possession",
  description: "Description",
};

/**
 * Uploads the CSV file to the backend for AI extraction and returns the
 * structured CRM result. Throws an Error with a readable message on failure.
 */
export async function extractLeads(file: File): Promise<ExtractionResult> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/leads/extract`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      "Could not reach the server. Please check that the backend is running.",
    );
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message);
  }

  return (await response.json()) as ExtractionResult;
}

/** Progress event emitted by the streaming extraction endpoint. */
export interface StreamProgress {
  batch: number;
  totalBatches: number;
  processedRows: number;
  totalRows: number;
}

export interface StreamHandlers {
  onMeta?: (meta: { totalRows: number; totalBatches: number; batchSize: number }) => void;
  onBatch?: (
    progress: StreamProgress & { imported: CrmRecord[]; skipped: SkippedRecord[] },
  ) => void;
}

/**
 * Uploads the CSV and consumes the backend's NDJSON progress stream, invoking
 * handlers as each batch completes, then resolves with the aggregated result.
 * This drives a real (not simulated) progress bar.
 */
export async function extractLeadsStream(
  file: File,
  handlers: StreamHandlers = {},
): Promise<ExtractionResult> {
  const formData = new FormData();
  formData.append("file", file);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/leads/extract/stream`, {
      method: "POST",
      body: formData,
    });
  } catch {
    throw new Error(
      "Could not reach the server. Please check that the backend is running.",
    );
  }

  if (!response.ok || !response.body) {
    let message = `Request failed with status ${response.status}.`;
    try {
      const body = (await response.json()) as { message?: string };
      if (body?.message) message = body.message;
    } catch {
      /* ignore non-JSON error bodies */
    }
    throw new Error(message);
  }

  const imported: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];
  let totalRows = 0;
  let streamError: string | null = null;

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed) return;
    const event = JSON.parse(trimmed) as Record<string, unknown>;
    switch (event.type) {
      case "meta":
        totalRows = Number(event.totalRows) || 0;
        handlers.onMeta?.({
          totalRows,
          totalBatches: Number(event.totalBatches) || 0,
          batchSize: Number(event.batchSize) || 0,
        });
        break;
      case "batch": {
        const batchImported = (event.imported as CrmRecord[]) ?? [];
        const batchSkipped = (event.skipped as SkippedRecord[]) ?? [];
        imported.push(...batchImported);
        skipped.push(...batchSkipped);
        handlers.onBatch?.({
          batch: Number(event.batch) || 0,
          totalBatches: Number(event.totalBatches) || 0,
          processedRows: Number(event.processedRows) || 0,
          totalRows: Number(event.totalRows) || totalRows,
          imported: batchImported,
          skipped: batchSkipped,
        });
        break;
      }
      case "error":
        streamError = String(event.message ?? "AI extraction failed.");
        break;
      default:
        break;
    }
  };

  // Read the stream line by line (NDJSON).
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let newlineIndex = buffer.indexOf("\n");
    while (newlineIndex !== -1) {
      handleLine(buffer.slice(0, newlineIndex));
      buffer = buffer.slice(newlineIndex + 1);
      newlineIndex = buffer.indexOf("\n");
    }
  }
  if (buffer.trim()) handleLine(buffer);

  if (streamError) throw new Error(streamError);

  return {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
    totalRows,
  };
}

/** Converts CRM records into a downloadable CSV string. */
export function recordsToCsv(records: CrmRecord[]): string {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
    return value;
  };
  const header = CRM_FIELDS.join(",");
  const lines = records.map((record) =>
    CRM_FIELDS.map((field) => escape(record[field] ?? "")).join(","),
  );
  return [header, ...lines].join("\n");
}
