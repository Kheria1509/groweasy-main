import {
  CRM_FIELDS,
  CRM_STATUS_VALUES,
  CrmRecord,
  CrmStatus,
  DATA_SOURCE_VALUES,
  DataSource,
} from "../types/crm";

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Trims a value and returns undefined for empty / nullish content. */
function clean(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  const str = String(value).trim();
  if (str === "" || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") {
    return undefined;
  }
  return str;
}

/** Returns true when a string is a date parseable by `new Date()`. */
export function isValidDate(value: string): boolean {
  const time = new Date(value).getTime();
  return !Number.isNaN(time);
}

/** Coerces the AI's crm_status to an allowed enum value, or drops it. */
function normalizeStatus(value: string | undefined): CrmStatus | undefined {
  if (!value) return undefined;
  const upper = value.trim().toUpperCase().replace(/[\s-]+/g, "_");
  return (CRM_STATUS_VALUES as readonly string[]).includes(upper)
    ? (upper as CrmStatus)
    : undefined;
}

/** Coerces the AI's data_source to an allowed enum value, or drops it. */
function normalizeDataSource(value: string | undefined): DataSource | undefined {
  if (!value) return undefined;
  const lower = value.trim().toLowerCase().replace(/[\s-]+/g, "_");
  return (DATA_SOURCE_VALUES as readonly string[]).includes(lower)
    ? (lower as DataSource)
    : undefined;
}

/** Appends a note fragment, keeping the CSV row single-line by escaping newlines. */
function appendNote(existing: string | undefined, addition: string): string {
  const safeAddition = addition.replace(/\r?\n/g, "\\n").trim();
  if (!existing) return safeAddition;
  return `${existing} | ${safeAddition}`;
}

/**
 * Normalizes a single AI-produced record into a clean, rule-compliant CRM record.
 *
 * Enforces the assignment's constraints defensively so the final output is
 * correct regardless of how well the AI followed instructions:
 *  - Only known CRM fields are kept.
 *  - crm_status / data_source are restricted to their allowed enums.
 *  - Extra emails and mobile numbers are folded into crm_note.
 *  - created_at is dropped if it is not parseable by `new Date()`.
 *  - Any newline is escaped so the record remains a single CSV row.
 */
export function normalizeRecord(raw: Record<string, unknown>): CrmRecord {
  const record: CrmRecord = {};

  for (const field of CRM_FIELDS) {
    const value = clean(raw[field]);
    if (value !== undefined) record[field] = value;
  }

  // Restrict enum-constrained fields.
  record.crm_status = normalizeStatus(record.crm_status);
  record.data_source = normalizeDataSource(record.data_source);

  // Drop unparseable dates.
  if (record.created_at && !isValidDate(record.created_at)) {
    record.crm_note = appendNote(record.crm_note, `Original date: ${record.created_at}`);
    delete record.created_at;
  }

  // Handle multiple emails: keep the first, move the rest into crm_note.
  if (record.email) {
    const emails = record.email.match(EMAIL_REGEX) ?? [record.email];
    record.email = emails[0];
    if (emails.length > 1) {
      record.crm_note = appendNote(
        record.crm_note,
        `Additional emails: ${emails.slice(1).join(", ")}`,
      );
    }
  }

  // Handle multiple mobile numbers: keep the first, move the rest into crm_note.
  if (record.mobile_without_country_code) {
    const numbers = record.mobile_without_country_code
      .split(/[,;/|]+/)
      .map((n) => n.trim())
      .filter(Boolean);
    if (numbers.length > 0) {
      record.mobile_without_country_code = numbers[0];
      if (numbers.length > 1) {
        record.crm_note = appendNote(
          record.crm_note,
          `Additional numbers: ${numbers.slice(1).join(", ")}`,
        );
      }
    }
  }

  // Ensure no field carries an unescaped newline (keeps CSV rows valid).
  for (const field of CRM_FIELDS) {
    const value = record[field];
    if (value) record[field] = value.replace(/\r?\n/g, "\\n");
  }

  // Remove keys that ended up undefined.
  for (const field of CRM_FIELDS) {
    if (record[field] === undefined) delete record[field];
  }

  return record;
}

/**
 * A record must contain at least an email or a mobile number to be kept.
 */
export function hasContact(record: CrmRecord): boolean {
  return Boolean(record.email) || Boolean(record.mobile_without_country_code);
}
