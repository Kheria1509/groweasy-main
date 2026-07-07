import { CRM_STATUS_VALUES, DATA_SOURCE_VALUES, RawRecord } from "../types/crm";

/**
 * System instruction describing the extraction task and all business rules.
 * Kept separate from the per-batch payload so it can be sent once as the
 * model's system prompt (cheaper and more consistent than repeating it).
 */
export const SYSTEM_INSTRUCTION = `You are a meticulous CRM data-extraction engine for GrowEasy.
You receive rows from an arbitrary CSV export (Facebook Ads, Google Ads, real-estate CRMs,
marketing sheets, manual spreadsheets, etc.). Column names, order, and layout are NOT fixed.
Your job is to intelligently map each row's available fields into the GrowEasy CRM schema.

Return ONLY a JSON array — no markdown, no code fences, no commentary. Each element maps 1:1
to an input row (same order) and uses exactly these keys:
  created_at, name, email, country_code, mobile_without_country_code, company, city, state,
  country, lead_owner, crm_status, crm_note, data_source, possession_time, description

RULES:
1. Only include a field when you can confidently map it. Omit fields you cannot determine
   (do not invent data). Use empty string "" only when a field is truly absent.
2. crm_status must be exactly one of: ${CRM_STATUS_VALUES.join(", ")}. If none fits, omit it.
3. data_source must be exactly one of: ${DATA_SOURCE_VALUES.join(", ")}. If none matches
   confidently, leave it blank/omit it.
4. created_at must be a string parseable by JavaScript's new Date(). Prefer
   "YYYY-MM-DD HH:mm:ss". If the source date is ambiguous or invalid, omit created_at.
5. country_code is the dialing prefix (e.g. "+91"); mobile_without_country_code is the local
   number with the prefix stripped. Split them apart if the source combined them.
6. crm_note holds remarks, follow-up notes, extra comments, extra phone numbers, and extra
   email addresses — anything useful that does not fit another field.
7. If a row has multiple emails, use the first in email and append the rest to crm_note.
   If a row has multiple mobile numbers, use the first and append the rest to crm_note.
8. Keep every record a single logical row. Do NOT emit raw newlines inside any value; escape
   them as \\n so the record stays a valid single CSV row.
9. Map ambiguous columns sensibly: "full name"/"contact"->name, "phone"/"mobile"/"whatsapp"->
   mobile, "notes"/"remarks"/"comment"->crm_note, "source"/"campaign"->data_source,
   "status"/"stage"/"disposition"->crm_status, "org"/"business"->company.
10. Always return the same number of array elements as input rows, in the same order.`;

/**
 * Builds the per-batch user prompt containing the rows to extract.
 */
export function buildBatchPrompt(rows: RawRecord[]): string {
  const numbered = rows.map((row, index) => ({ row_index: index, data: row }));
  return `Extract CRM records from the following ${rows.length} CSV row(s).
Respond with a JSON array of ${rows.length} objects, one per row, in the same order.

INPUT ROWS:
${JSON.stringify(numbered, null, 2)}`;
}
