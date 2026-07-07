/** CRM fields extracted by the backend, in display order. */
export const CRM_FIELDS = [
  "created_at",
  "name",
  "email",
  "country_code",
  "mobile_without_country_code",
  "company",
  "city",
  "state",
  "country",
  "lead_owner",
  "crm_status",
  "crm_note",
  "data_source",
  "possession_time",
  "description",
] as const;

export type CrmField = (typeof CRM_FIELDS)[number];

export type CrmRecord = Partial<Record<CrmField, string>>;

export interface RawRecord {
  [key: string]: string;
}

export interface SkippedRecord {
  row: number;
  reason: string;
  data: RawRecord;
}

export interface ExtractionResult {
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  totalRows: number;
}

/** Parsed CSV preview data produced entirely in the browser. */
export interface CsvPreview {
  headers: string[];
  rows: RawRecord[];
  fileName: string;
  fileSize: number;
}
