import { Client } from "@hubspot/api-client";
import { getHubSpotAccessToken, isHubSpotConfigured } from "../config.js";

let client: Client | null = null;

export function resetHubSpotClient(): void {
  client = null;
}

export function getHubSpotClient(): Client {
  if (!isHubSpotConfigured()) {
    throw new Error(
      "HUBSPOT_ACCESS_TOKEN is not set. Add your HubSpot private app token in Settings.",
    );
  }

  client ??= new Client({ accessToken: getHubSpotAccessToken() });
  return client;
}

export async function verifyHubSpotConnection(): Promise<{
  connected: boolean;
  message: string;
}> {
  if (!isHubSpotConfigured()) {
    return {
      connected: false,
      message: "HUBSPOT_ACCESS_TOKEN is not configured",
    };
  }

  try {
    const hubspot = getHubSpotClient();
    await hubspot.crm.contacts.basicApi.getPage(1);
    return { connected: true, message: "Connected to HubSpot" };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown HubSpot error";
    return { connected: false, message };
  }
}
