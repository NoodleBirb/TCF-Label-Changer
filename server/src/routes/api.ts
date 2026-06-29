import { Router } from "express";
import { isHubSpotConfigured } from "../config.js";
import { verifyHubSpotConnection } from "../hubspot/client.js";
import { setupRouter } from "./setup.js";
import { trainingsRouter } from "./trainings.js";

export const apiRouter = Router();

apiRouter.use(setupRouter);
apiRouter.use(trainingsRouter);

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
      message: "Add your HubSpot private app token in Settings.",
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

apiRouter.use((_req, res) => {
  res.status(404).json({ error: "API route not found" });
});
