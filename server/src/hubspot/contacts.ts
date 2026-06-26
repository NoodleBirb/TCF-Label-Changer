import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/contacts/models/Filter.js";
import { contactProperties } from "./domainConfig.js";
import { getHubSpotClient } from "./client.js";

const CONTACT_READ_PROPERTIES = [
  contactProperties.firstName,
  contactProperties.lastName,
  contactProperties.email,
  "hs_full_name",
] as const;

export type ContactDetails = {
  firstName: string;
  lastName: string;
  email: string;
};

function normalizeContactId(id: string | number): string {
  return String(id);
}

function parseContactDetails(
  properties: Record<string, string | null | undefined>,
): ContactDetails {
  const firstName = properties[contactProperties.firstName]?.trim() ?? "";
  const lastName = properties[contactProperties.lastName]?.trim() ?? "";
  const email = properties[contactProperties.email]?.trim() ?? "";

  if (firstName || lastName) {
    return { firstName, lastName, email };
  }

  const fullName = properties.hs_full_name?.trim() ?? "";
  if (fullName) {
    const parts = fullName.split(/\s+/);
    return {
      firstName: parts[0] ?? "",
      lastName: parts.slice(1).join(" "),
      email,
    };
  }

  return { firstName, lastName, email };
}

export async function fetchContactDetailsByIds(
  contactIds: Array<string | number>,
): Promise<Map<string, ContactDetails>> {
  const uniqueIds = [...new Set(contactIds.map(normalizeContactId))];
  const detailsById = new Map<string, ContactDetails>();

  if (uniqueIds.length === 0) {
    return detailsById;
  }

  const hubspot = getHubSpotClient();

  const searchResponse = await hubspot.crm.contacts.searchApi.doSearch({
    filterGroups: [
      {
        filters: [
          {
            propertyName: "hs_object_id",
            operator: FilterOperatorEnum.In,
            values: uniqueIds,
          },
        ],
      },
    ],
    properties: [...CONTACT_READ_PROPERTIES],
    limit: Math.min(uniqueIds.length, 100),
  });

  for (const contact of searchResponse.results) {
    detailsById.set(
      normalizeContactId(contact.id),
      parseContactDetails(contact.properties),
    );
  }

  const missingIds = uniqueIds.filter((id) => !detailsById.has(id));
  if (missingIds.length > 0) {
    const batchResponse = await hubspot.crm.contacts.batchApi.read({
      properties: [...CONTACT_READ_PROPERTIES],
      inputs: missingIds.map((id) => ({ id })),
      propertiesWithHistory: [],
    });

    for (const contact of batchResponse.results) {
      detailsById.set(
        normalizeContactId(contact.id),
        parseContactDetails(contact.properties),
      );
    }
  }

  return detailsById;
}

export function formatContactName(details: ContactDetails): string {
  const name = `${details.firstName} ${details.lastName}`.trim();
  return name || details.email;
}
