import { Router } from "express";
import {
  extractLeadsController,
  extractLeadsStreamController,
} from "../controllers/leadsController";
import { uploadCsv } from "../middleware/upload";

const router = Router();

/** Extract CRM leads from an uploaded CSV file. */
router.post("/extract", uploadCsv, extractLeadsController);

/** Extract CRM leads with incremental NDJSON progress streaming. */
router.post("/extract/stream", uploadCsv, extractLeadsStreamController);

export default router;
