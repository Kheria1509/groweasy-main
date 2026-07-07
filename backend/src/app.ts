import cors from "cors";
import express, { Application } from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import routes from "./routes";

/**
 * Builds and configures the Express application. Exported separately from the
 * server bootstrap so it can be imported directly in integration tests.
 */
export function createApp(): Application {
  const app = express();

  app.use(
    cors({
      origin: env.corsOrigins.includes("*") ? true : env.corsOrigins,
    }),
  );
  app.use(express.json({ limit: "1mb" }));

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
