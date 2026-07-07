import {
  CrmRecord,
  ExtractionResult,
  RawRecord,
  SkippedRecord,
} from "../types/crm";
import { hasContact, normalizeRecord } from "../utils/crmNormalizer";
import { logger } from "../utils/logger";
import { LeadExtractor } from "./aiService";
import { chunk } from "./csvService";

export interface ExtractionOptions {
  batchSize: number;
  /**
   * Optional callback invoked after each batch completes, enabling incremental
   * streaming of results and real progress reporting to the client.
   */
  onBatch?: (progress: BatchProgress) => void | Promise<void>;
}

/** Progress emitted after a single batch has been processed. */
export interface BatchProgress {
  /** 1-based index of the batch that just finished. */
  batch: number;
  /** Total number of batches for this import. */
  totalBatches: number;
  /** Cumulative number of source rows processed so far. */
  processedRows: number;
  /** Total number of source rows in the import. */
  totalRows: number;
  /** Records successfully imported from this batch. */
  imported: CrmRecord[];
  /** Records skipped in this batch, with reasons. */
  skipped: SkippedRecord[];
}

/**
 * Orchestrates the full extraction pipeline for already-parsed CSV rows:
 *   split into batches -> AI extract -> normalize -> apply skip rules.
 *
 * The AI extractor is injected so the pipeline is easy to unit-test with a
 * fake extractor and swap for a different LLM provider. An optional `onBatch`
 * callback receives incremental results so callers can stream progress.
 */
export async function extractLeads(
  rows: RawRecord[],
  extractor: LeadExtractor,
  options: ExtractionOptions,
): Promise<ExtractionResult> {
  const imported: CrmRecord[] = [];
  const skipped: SkippedRecord[] = [];
  const batches = chunk(rows, options.batchSize);

  let rowOffset = 0;
  for (let b = 0; b < batches.length; b += 1) {
    const batch = batches[b];
    // Per-batch buckets so we can report incremental progress.
    const batchImported: CrmRecord[] = [];
    const batchSkipped: SkippedRecord[] = [];
    logger.info("Processing AI batch", {
      batch: b + 1,
      of: batches.length,
      size: batch.length,
    });

    let aiRecords: Record<string, unknown>[] | null = null;
    try {
      aiRecords = await extractor.extractBatch(batch);
    } catch (error) {
      // A whole batch failed even after retries: skip its rows rather than
      // failing the entire import, so partial results are still returned.
      logger.error("Batch failed permanently, skipping its rows", {
        batch: b + 1,
        error: error instanceof Error ? error.message : String(error),
      });
      batch.forEach((data, i) => {
        batchSkipped.push({
          row: rowOffset + i + 1,
          reason: "AI extraction failed for this batch after retries.",
          data,
        });
      });
    }

    if (aiRecords) {
      batch.forEach((sourceRow, i) => {
        const rowNumber = rowOffset + i + 1;
        const aiRecord = aiRecords![i];

        if (!aiRecord) {
          batchSkipped.push({
            row: rowNumber,
            reason: "AI did not return a record for this row.",
            data: sourceRow,
          });
          return;
        }

        const normalized = normalizeRecord(aiRecord);

        // Skip records lacking both an email and a mobile number.
        if (!hasContact(normalized)) {
          batchSkipped.push({
            row: rowNumber,
            reason: "Record has neither an email nor a mobile number.",
            data: sourceRow,
          });
          return;
        }

        batchImported.push(normalized);
      });
    }

    imported.push(...batchImported);
    skipped.push(...batchSkipped);
    rowOffset += batch.length;

    if (options.onBatch) {
      await options.onBatch({
        batch: b + 1,
        totalBatches: batches.length,
        processedRows: rowOffset,
        totalRows: rows.length,
        imported: batchImported,
        skipped: batchSkipped,
      });
    }
  }

  return {
    imported,
    skipped,
    totalImported: imported.length,
    totalSkipped: skipped.length,
    totalRows: rows.length,
  };
}
