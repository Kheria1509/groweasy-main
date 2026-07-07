import cors from "cors";
import express, { Application } from "express";
import { env } from "./config/env";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler";
import routes from "./routes";

/**
 * Builds and configures the Express application.
 */
export function createApp(): Application {
  const app = express();

  // Enable CORS
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow requests without an Origin header (Postman, curl, etc.)
        if (!origin) {
          return callback(null, true);
        }

        if (
          env.corsOrigins.includes("*") ||
          env.corsOrigins.includes(origin)
        ) {
          return callback(null, true);
        }

        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "Accept",
        "Origin",
      ],
      exposedHeaders: [
        "Content-Type",
      ],
    })
  );

  // Handle preflight requests
  app.options("*", cors());

  app.use(express.json({ limit: "1mb" }));

  app.use("/api", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}