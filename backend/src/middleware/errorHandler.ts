import { NextFunction, Request, Response } from "express";
import { MulterError } from "multer";
import { AppError } from "../utils/errors";
import { logger } from "../utils/logger";

/** 404 handler for unmatched routes. */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: "NotFound",
    message: `Route ${req.method} ${req.originalUrl} was not found.`,
  });
}

/**
 * Central error handler. Converts known error types into consistent JSON and
 * hides internal details for unexpected failures.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  if (err instanceof MulterError) {
    const message =
      err.code === "LIMIT_FILE_SIZE"
        ? "The uploaded file exceeds the maximum allowed size."
        : err.message;
    res.status(400).json({ error: "UploadError", message });
    return;
  }

  if (err instanceof AppError) {
    if (!err.isOperational) logger.error("Operational-flagged error", err);
    res.status(err.statusCode).json({
      error: err.constructor.name,
      message: err.message,
    });
    return;
  }

  logger.error("Unhandled error", {
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
  });
  res.status(500).json({
    error: "InternalServerError",
    message: "An unexpected error occurred while processing the request.",
  });
}
