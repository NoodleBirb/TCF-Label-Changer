import { Router } from "express";
import { resetHubSpotClient, verifyHubSpotConnection } from "../hubspot/client.js";
import {
  getHubSpotAccessToken,
  isHubSpotConfigured,
  setHubSpotAccessToken,
} from "../config.js";
import {
  canPersistUserConfig,
  saveUserConfig,
} from "../userConfig.js";

export const setupRouter = Router();

setupRouter.get("/setup/status", async (_req, res) => {
  const supportsSetup = canPersistUserConfig();
  const configured = isHubSpotConfigured();

  if (!configured) {
    res.json({
      configured: false,
      connected: false,
      supportsSetup,
      message: supportsSetup
        ? "Enter your HubSpot private app token to get started."
        : "Add HUBSPOT_ACCESS_TOKEN to your .env file.",
    });
    return;
  }

  const result = await verifyHubSpotConnection();
  res.json({
    configured: true,
    connected: result.connected,
    supportsSetup,
    message: result.message,
  });
});

setupRouter.post("/setup/token", async (req, res) => {
  if (!canPersistUserConfig()) {
    res.status(400).json({
      error:
        "This build stores the token in a .env file. Edit .env and restart the app.",
    });
    return;
  }

  const token = req.body?.token;
  if (typeof token !== "string" || !token.trim()) {
    res.status(400).json({ error: "A HubSpot access token is required." });
    return;
  }

  try {
    saveUserConfig({ hubspotAccessToken: token });
    setHubSpotAccessToken(token);
    resetHubSpotClient();

    const result = await verifyHubSpotConnection();
    if (!result.connected) {
      res.status(400).json({
        error: result.message,
      });
      return;
    }

    res.json({
      connected: true,
      message: result.message,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to save token";
    res.status(500).json({ error: message });
  }
});

setupRouter.get("/setup/token-masked", (_req, res) => {
  if (!isHubSpotConfigured()) {
    res.json({ hasToken: false, masked: "" });
    return;
  }

  const token = getHubSpotAccessToken();
  const visible = token.slice(-4);
  const masked =
    token.length <= 4 ? "****" : `${"*".repeat(Math.min(token.length - 4, 12))}${visible}`;

  res.json({ hasToken: true, masked });
});
