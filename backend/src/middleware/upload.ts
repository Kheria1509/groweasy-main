import multer from "multer";
import { env } from "../config/env";
import { BadRequestError } from "../utils/errors";

/**
 * In-memory multer upload for a single CSV file under the `file` field.
 * Memory storage keeps the service stateless (no temp files on disk).
 */
export const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.maxUploadBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    const name = file.originalname.toLowerCase();
    const isCsv =
      name.endsWith(".csv") ||
      file.mimetype === "text/csv" ||
      file.mimetype === "application/vnd.ms-excel" ||
      file.mimetype === "application/csv" ||
      file.mimetype === "text/plain";
    if (!isCsv) {
      cb(new BadRequestError("Only .csv files are supported."));
      return;
    }
    cb(null, true);
  },
}).single("file");
