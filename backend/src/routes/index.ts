import { Router } from "express";
import { isGeminiConfigured } from "../config/env";
import leadsRoutes from "./leadsRoutes";

const router = Router();

router.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    aiConfigured: isGeminiConfigured(),
    timestamp: new Date().toISOString(),
  });
});

router.use("/leads", leadsRoutes);

export default router;
