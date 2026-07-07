import { NextFunction, Request, Response } from "express";
import { env, isGeminiConfigured } from "../config/env";
import { GeminiExtractor } from "../services/aiService";
import { parseCsv } from "../services/csvService";
import { extractLeads } from "../services/extractionService";
import { BadRequestError, ServiceUnavailableError } from "../utils/errors";

/**
 * POST /api/leads/extract
 * Accepts a multipart CSV upload, parses it, runs AI extraction in batches,
 * and returns structured CRM records plus skipped rows.
 */
export async function extractLeadsController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!req.file) {
      throw new BadRequestError("No CSV file was uploaded under the 'file' field.");
    }
    if (!isGeminiConfigured()) {
      throw new ServiceUnavailableError(
        "AI service is not configured. Set GEMINI_API_KEY on the server.",
      );
    }

    const { rows } = parseCsv(req.file.buffer);
    const extractor = new GeminiExtractor();
    const result = await extractLeads(rows, extractor, {
      batchSize: env.gemini.batchSize,
    });

    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/leads/extract/stream
 * Same as the standard endpoint but streams progress incrementally as
 * newline-delimited JSON (NDJSON), one event per line:
 *   { type: "meta",  totalRows, totalBatches, batchSize }
 *   { type: "batch", batch, totalBatches, processedRows, totalRows, imported, skipped }
 *   { type: "done",  totalImported, totalSkipped, totalRows }
 *   { type: "error", message }
 *
 * This powers a real (not simulated) progress bar and lets the UI render
 * results as each batch finishes.
 */
export async function extractLeadsStreamController(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  // Validate before any streaming headers are sent so failures return normal
  // JSON errors via the central error handler.
  try {
    if (!req.file) {
      throw new BadRequestError("No CSV file was uploaded under the 'file' field.");
    }
    if (!isGeminiConfigured()) {
      throw new ServiceUnavailableError(
        "AI service is not configured. Set GEMINI_API_KEY on the server.",
      );
    }
  } catch (error) {
    next(error);
    return;
  }

  const { rows } = parseCsv(req.file!.buffer);

  res.status(200);
  res.setHeader("Content-Type", "application/x-ndjson; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no"); // disable proxy buffering (e.g. nginx)

  const write = (event: Record<string, unknown>) => {
    res.write(`${JSON.stringify(event)}\n`);
  };

  const totalBatches = Math.max(1, Math.ceil(rows.length / env.gemini.batchSize));
  write({
    type: "meta",
    totalRows: rows.length,
    totalBatches,
    batchSize: env.gemini.batchSize,
  });

  try {
    const extractor = new GeminiExtractor();
    const result = await extractLeads(rows, extractor, {
      batchSize: env.gemini.batchSize,
      onBatch: (progress) => {
        write({ type: "batch", ...progress });
      },
    });

    write({
      type: "done",
      totalImported: result.totalImported,
      totalSkipped: result.totalSkipped,
      totalRows: result.totalRows,
    });
    res.end();
  } catch (error) {
    // The stream has already started, so surface the error as a stream event.
    write({
      type: "error",
      message:
        error instanceof Error
          ? error.message
          : "An unexpected error occurred during extraction.",
    });
    res.end();
  }
}
