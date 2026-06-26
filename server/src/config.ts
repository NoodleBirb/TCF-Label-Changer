import { config } from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "../..");

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
  clientDistPath: path.join(projectRoot, "client", "dist"),
} as const;

export function isHubSpotConfigured(): boolean {
  return appConfig.hubspotAccessToken.length > 0;
}
