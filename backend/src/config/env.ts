import dotenv from "dotenv";

dotenv.config();

/**
 * Reads and validates environment configuration once at startup.
 * Throwing early gives clear feedback instead of failing deep in a request.
 */
function requiredNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") return fallback;
  const value = Number(raw);
  if (Number.isNaN(value) || value <= 0) {
    throw new Error(`Environment variable ${name} must be a positive number.`);
  }
  return value;
}

export const env = {
  port: requiredNumber("PORT", 4000),
  nodeEnv: process.env.NODE_ENV ?? "development",
  corsOrigins: (process.env.CORS_ORIGIN ?? "http://localhost:3000")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean),
  maxUploadBytes: requiredNumber("MAX_UPLOAD_BYTES", 10 * 1024 * 1024),
  gemini: {
    apiKey: process.env.GEMINI_API_KEY ?? "",
    model: process.env.GEMINI_MODEL ?? "gemini-2.5-flash-lite",
    batchSize: requiredNumber("AI_BATCH_SIZE", 25),
    maxRetries: requiredNumber("AI_MAX_RETRIES", 3),
  },
} as const;

export const isGeminiConfigured = (): boolean => env.gemini.apiKey.length > 0;
