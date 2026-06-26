import { Router } from "express";
import { isHubSpotConfigured } from "../config.js";
import { verifyHubSpotConnection } from "../hubspot/client.js";

export const apiRouter = Router();

apiRouter.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
});

apiRouter.get("/hubspot/status", async (_req, res) => {
  const configured = isHubSpotConfigured();

  if (!configured) {
    res.json({
      configured: false,
      connected: false,
      message: "Add HUBSPOT_ACCESS_TOKEN to your .env file",
    });
    return;
  }

  const result = await verifyHubSpotConnection();
  res.json({
    configured: true,
    connected: result.connected,
    message: result.message,
  });
});
