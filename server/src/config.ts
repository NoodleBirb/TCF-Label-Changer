import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadUserConfig } from "./userConfig.js";

declare const __dirname: string | undefined;

const moduleDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

function isElectronRuntime(): boolean {
  return process.env.ELECTRON_APP === "1";
}

function resolveProjectRoot(): string {
  if (isElectronRuntime()) {
    return process.env.ELECTRON_APP_ROOT?.trim() || path.dirname(process.execPath);
  }

  return path.resolve(moduleDir, "../..");
}

const projectRoot = resolveProjectRoot();

config({ path: path.join(projectRoot, ".env") });
config({ path: path.join(projectRoot, "server", ".env") });

const userConfig = loadUserConfig();

let hubspotAccessToken =
  userConfig?.hubspotAccessToken ||
  process.env.HUBSPOT_ACCESS_TOKEN?.trim() ||
  "";

function resolveClientDistPath(): string {
  const fromEnv = process.env.CLIENT_DIST_PATH?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  return path.join(projectRoot, "client", "dist");
}

function readPort(): number {
  const raw = process.env.PORT ?? "3001";
  const port = Number.parseInt(raw, 10);
  if (!Number.isFinite(port) || port < 1 || port > 65535) {
    throw new Error(`Invalid PORT value: ${raw}`);
  }
  return port;
}

export const appConfig = {
  port: readPort(),
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: (process.env.NODE_ENV ?? "development") === "production",
  isElectron: isElectronRuntime(),
  projectRoot,
  clientDistPath: resolveClientDistPath(),
  configFilePath: process.env.CONFIG_FILE_PATH?.trim() ?? null,
} as const;

export function getHubSpotAccessToken(): string {
  return hubspotAccessToken;
}

export function setHubSpotAccessToken(token: string): void {
  hubspotAccessToken = token.trim();
  process.env.HUBSPOT_ACCESS_TOKEN = hubspotAccessToken;
}

export function isHubSpotConfigured(): boolean {
  return getHubSpotAccessToken().length > 0;
}
