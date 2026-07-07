/**
 * Shared domain types for the GrowEasy CSV Importer backend.
 */

/** Allowed CRM lead status values. */
export const CRM_STATUS_VALUES = [
  "GOOD_LEAD_FOLLOW_UP",
  "DID_NOT_CONNECT",
  "BAD_LEAD",
  "SALE_DONE",
] as const;

export type CrmStatus = (typeof CRM_STATUS_VALUES)[number];

/** Allowed data source values. */
export const DATA_SOURCE_VALUES = [
  "leads_on_demand",
  "meridian_tower",
  "eden_park",
  "varah_swamy",
  "sarjapur_plots",
] as const;

export type DataSource = (typeof DATA_SOURCE_VALUES)[number];

/** Ordered list of CRM fields the AI attempts to extract. */
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

/** A single normalized CRM lead record. All fields are optional strings. */
export type CrmRecord = {
  [K in CrmField]?: string;
};

/** A raw row parsed from the uploaded CSV (unknown headers). */
export type RawRecord = Record<string, string>;

/** A record that was skipped during extraction, with a reason. */
export interface SkippedRecord {
  row: number;
  reason: string;
  data: RawRecord;
}

/** Aggregated result returned by the extraction endpoint. */
export interface ExtractionResult {
  imported: CrmRecord[];
  skipped: SkippedRecord[];
  totalImported: number;
  totalSkipped: number;
  totalRows: number;
}
