import fs from "node:fs";
import path from "node:path";

export interface UserConfig {
  hubspotAccessToken: string;
}

export function getConfigFilePath(): string | null {
  const configPath = process.env.CONFIG_FILE_PATH?.trim();
  return configPath ? configPath : null;
}

export function canPersistUserConfig(): boolean {
  return getConfigFilePath() !== null;
}

export function loadUserConfig(): UserConfig | null {
  const configPath = getConfigFilePath();
  if (!configPath || !fs.existsSync(configPath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<UserConfig>;
    return {
      hubspotAccessToken: parsed.hubspotAccessToken?.trim() ?? "",
    };
  } catch {
    return null;
  }
}

export function saveUserConfig(config: UserConfig): void {
  const configPath = getConfigFilePath();
  if (!configPath) {
    throw new Error("CONFIG_FILE_PATH is not set");
  }

  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(
    configPath,
    JSON.stringify(
      { hubspotAccessToken: config.hubspotAccessToken.trim() },
      null,
      2,
    ),
    "utf8",
  );
}
