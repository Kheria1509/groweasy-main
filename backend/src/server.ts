import { createApp } from "./app";
import { env, isGeminiConfigured } from "./config/env";
import { logger } from "./utils/logger";

const app = createApp();

const server = app.listen(env.port, () => {
  logger.info("GrowEasy CSV Importer backend started", {
    port: env.port,
    env: env.nodeEnv,
    aiConfigured: isGeminiConfigured(),
  });
  if (!isGeminiConfigured()) {
    logger.warn("GEMINI_API_KEY is not set — extraction requests will fail.");
  }
});

// Graceful shutdown so in-flight requests can finish on redeploys.
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}, shutting down gracefully.`);
  server.close(() => {
    logger.info("Server closed.");
    process.exit(0);
  });
};

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
