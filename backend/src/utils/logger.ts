/* eslint-disable no-console */

/**
 * Minimal structured logger. Kept dependency-free so the service stays light;
 * swap the implementation for pino/winston without touching call sites.
 */
type Level = "info" | "warn" | "error" | "debug";

function log(level: Level, message: string, meta?: unknown): void {
  const entry = {
    level,
    time: new Date().toISOString(),
    message,
    ...(meta !== undefined ? { meta } : {}),
  };
  const line = JSON.stringify(entry);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export const logger = {
  info: (message: string, meta?: unknown) => log("info", message, meta),
  warn: (message: string, meta?: unknown) => log("warn", message, meta),
  error: (message: string, meta?: unknown) => log("error", message, meta),
  debug: (message: string, meta?: unknown) => {
    if (process.env.NODE_ENV !== "production") log("debug", message, meta);
  },
};
