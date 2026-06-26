import { isSea } from "node:sea";
import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

declare const __dirname: string | undefined;

const moduleDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

function isPackagedRuntime(): boolean {
  return isSea() || "pkg" in process;
}

function resolveProjectRoot(): string {
  if (isPackagedRuntime()) {
    return path.dirname(process.execPath);
  }

  const fromModule = path.resolve(moduleDir, "../..");
  if (fs.existsSync(path.join(fromModule, "client", "dist"))) {
    return fromModule;
  }

  return fromModule;
}

const projectRoot = resolveProjectRoot();

config({ path: path.join(projectRoot, ".env") });
config({ path: path.join(projectRoot, "server", ".env") });

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
  hubspotAccessToken: process.env.HUBSPOT_ACCESS_TOKEN?.trim() ?? "",
  isProduction: (process.env.NODE_ENV ?? "development") === "production",
  isPackaged: isPackagedRuntime(),
  projectRoot,
  clientDistPath: path.join(projectRoot, "client", "dist"),
} as const;

export function isHubSpotConfigured(): boolean {
  return appConfig.hubspotAccessToken.length > 0;
}
