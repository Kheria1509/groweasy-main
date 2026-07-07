import {
  GenerativeModel,
  GoogleGenerativeAI,
} from "@google/generative-ai";
import { env } from "../config/env";
import { RawRecord } from "../types/crm";
import { ServiceUnavailableError } from "../utils/errors";
import { extractJsonArray } from "../utils/jsonExtract";
import { logger } from "../utils/logger";
import { buildBatchPrompt, SYSTEM_INSTRUCTION } from "./prompt";

/**
 * Abstraction over any LLM that can turn raw CSV rows into CRM records.
 * Swapping Gemini for OpenAI/Claude only requires another implementation.
 */
export interface LeadExtractor {
  extractBatch(rows: RawRecord[]): Promise<Record<string, unknown>[]>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Upper bound on how long we'll wait for a single retry (ms). */
const MAX_RETRY_DELAY_MS = 30_000;

/** Errors worth retrying: rate limits, timeouts and transient 5xx responses. */
function isTransient(error: unknown): boolean {
  const message = error instanceof Error ? error.message.toLowerCase() : "";
  return (
    message.includes("429") ||
    message.includes("rate") ||
    message.includes("quota") ||
    message.includes("timeout") ||
    message.includes("503") ||
    message.includes("500") ||
    message.includes("overloaded") ||
    message.includes("unavailable")
  );
}

/**
 * Extracts the server-suggested retry delay (ms) from a Gemini 429 error.
 * The API returns both a human phrase ("Please retry in 21.8s.") and a
 * structured RetryInfo ("retryDelay":"21s"); we honor it so rate-limited
 * batches recover instead of being dropped. Returns 0 when none is present.
 */
export function parseRetryDelayMs(error: unknown): number {
  const message = error instanceof Error ? error.message : String(error);
  const structured = message.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/i);
  const phrase = message.match(/retry in\s+(\d+(?:\.\d+)?)s/i);
  const seconds = structured?.[1] ?? phrase?.[1];
  if (!seconds) return 0;
  const ms = Math.ceil(Number(seconds) * 1000) + 250; // small safety margin
  return Math.min(MAX_RETRY_DELAY_MS, ms);
}

export class GeminiExtractor implements LeadExtractor {
  private readonly model: GenerativeModel;
  private readonly maxRetries: number;

  constructor() {
    if (!env.gemini.apiKey) {
      throw new ServiceUnavailableError(
        "GEMINI_API_KEY is not configured on the server.",
      );
    }
    const client = new GoogleGenerativeAI(env.gemini.apiKey);
    this.model = client.getGenerativeModel({
      model: env.gemini.model,
      systemInstruction: SYSTEM_INSTRUCTION,
      generationConfig: {
        temperature: 0.1,
        // Ask for JSON output but do NOT pin a rigid responseSchema: across
        // Gemini models an all-optional object schema makes the model lazily
        // emit only a few fields. The detailed prompt already specifies the
        // exact keys and rules, which yields far more complete extractions.
        responseMimeType: "application/json",
      },
    });
    this.maxRetries = env.gemini.maxRetries;
  }

  /**
   * Sends one batch of rows to Gemini, retrying transient failures. Rate-limit
   * (429) responses wait for the server-suggested delay; other transient errors
   * use exponential backoff. Returns raw objects (validation happens downstream).
   */
  async extractBatch(rows: RawRecord[]): Promise<Record<string, unknown>[]> {
    const prompt = buildBatchPrompt(rows);
    let lastError: unknown;

    for (let attempt = 1; attempt <= this.maxRetries; attempt += 1) {
      try {
        const response = await this.model.generateContent(prompt);
        const text = response.response.text();
        const parsed = extractJsonArray(text);
        return parsed.map((item) =>
          typeof item === "object" && item !== null
            ? (item as Record<string, unknown>)
            : {},
        );
      } catch (error) {
        lastError = error;
        const retriable = isTransient(error);
        logger.warn("AI batch attempt failed", {
          attempt,
          retriable,
          error: error instanceof Error ? error.message : String(error),
        });
        if (!retriable || attempt === this.maxRetries) break;
        // Honor the server's suggested retry delay for rate limits; otherwise
        // fall back to exponential backoff (0.5s, 1s, 2s ...).
        const backoff = 2 ** (attempt - 1) * 500;
        const suggested = parseRetryDelayMs(error);
        await sleep(Math.min(MAX_RETRY_DELAY_MS, Math.max(backoff, suggested)));
      }
    }

    throw new ServiceUnavailableError(
      `AI extraction failed after ${this.maxRetries} attempt(s): ${
        lastError instanceof Error ? lastError.message : String(lastError)
      }`,
    );
  }
}
