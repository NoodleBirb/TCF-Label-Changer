import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/objects/models/Filter.js";
import type { ProgramId } from "./domainConfig.js";
import {
  contactProperties,
  programs,
  trainingConfig,
  TRAINING_OBJECT_TYPE,
  visibleContactLabels,
  type AssociationLabelKey,
} from "./domainConfig.js";
import { getHubSpotClient } from "./client.js";
import {
  contactHasLabel,
  getAssociationLabelSpecs,
  getContactLabelKey,
  getLabelSpec,
  type AssociationType,
  type ResolvedAssociationSpec,
} from "./associationLabels.js";

export type TrainingSummary = {
  id: string;
  name: string;
};

export type TrainingContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  label: AssociationLabelKey;
  selectable: boolean;
};

export type ContactUpdateResult = {
  contactId: string;
  name: string;
  success: boolean;
  message: string;
};

export async function listClosedTrainings(
  programId: ProgramId,
): Promise<TrainingSummary[]> {
  const program = programs[programId];
  const hubspot = getHubSpotClient();

  const response = await hubspot.crm.objects.searchApi.doSearch(
    TRAINING_OBJECT_TYPE,
    {
      filterGroups: [
        {
          filters: [
            {
              propertyName: trainingConfig.pipelineProperty,
              operator: FilterOperatorEnum.Eq,
              value: program.pipelineType,
            },
            {
              propertyName: trainingConfig.pipelineStageProperty,
              operator: FilterOperatorEnum.Eq,
              value: program.closedPipelineStage,
            },
          ],
        },
      ],
      properties: [trainingConfig.nameProperty, "name"],
      sorts: [trainingConfig.nameProperty],
      limit: 100,
    },
  );

  return response.results.map((training) => ({
    id: training.id,
    name:
      training.properties[trainingConfig.nameProperty] ??
      training.properties.name ??
      `Training ${training.id}`,
  }));
}

async function listAllAssociatedContacts(trainingId: string) {
  const hubspot = getHubSpotClient();
  const results: Array<{
    toObjectId: string;
    associationTypes: AssociationType[];
  }> = [];

  let after: string | undefined;
  do {
    const page = await hubspot.crm.associations.v4.basicApi.getPage(
      TRAINING_OBJECT_TYPE,
      trainingId,
      "contacts",
      after,
      100,
    );

    for (const row of page.results) {
      results.push({
        toObjectId: row.toObjectId,
        associationTypes: row.associationTypes,
      });
    }

    after = page.paging?.next?.after;
  } while (after);

  return results;
}

export async function listTrainingContacts(
  trainingId: string,
): Promise<TrainingContact[]> {
  const associations = await listAllAssociatedContacts(trainingId);
  const visible = associations.filter((row) => {
    const label = getContactLabelKey(row.associationTypes);
    return label !== null && visibleContactLabels.includes(label);
  });

  if (visible.length === 0) {
    return [];
  }

  const hubspot = getHubSpotClient();
  const contactResponse = await hubspot.crm.contacts.batchApi.read({
    properties: Object.values(contactProperties),
    inputs: visible.map((row) => ({ id: row.toObjectId })),
    propertiesWithHistory: [],
  });

  const propertiesById = new Map(
    contactResponse.results.map((contact) => [contact.id, contact.properties]),
  );

  const contacts: TrainingContact[] = visible.map((row) => {
    const label = getContactLabelKey(row.associationTypes)!;
    const properties = propertiesById.get(row.toObjectId) ?? {};
    const firstName = properties[contactProperties.firstName] ?? "";
    const lastName = properties[contactProperties.lastName] ?? "";

    return {
      id: row.toObjectId,
      firstName,
      lastName,
      email: properties[contactProperties.email] ?? "",
      label,
      selectable: label === "registrant",
    };
  });

  contacts.sort((a, b) => {
    const last = a.lastName.localeCompare(b.lastName, undefined, {
      sensitivity: "base",
    });
    if (last !== 0) {
      return last;
    }
    return a.firstName.localeCompare(b.firstName, undefined, {
      sensitivity: "base",
    });
  });

  return contacts;
}

function toAssociationInput(
  trainingId: string,
  contactId: string,
  spec: ResolvedAssociationSpec,
) {
  return {
    _from: { id: trainingId },
    to: { id: contactId },
    types: [
      {
        associationCategory: spec.associationCategory,
        associationTypeId: spec.associationTypeId,
      },
    ],
  };
}

async function relabelContact(
  trainingId: string,
  contactId: string,
  fromLabel: AssociationLabelKey,
  toLabel: AssociationLabelKey,
): Promise<void> {
  const hubspot = getHubSpotClient();
  const fromSpec = await getLabelSpec(fromLabel);
  const toSpec = await getLabelSpec(toLabel);

  await hubspot.crm.associations.v4.batchApi.archiveLabels(
    TRAINING_OBJECT_TYPE,
    "contacts",
    {
      inputs: [toAssociationInput(trainingId, contactId, fromSpec)],
    },
  );

  await hubspot.crm.associations.v4.batchApi.create(
    TRAINING_OBJECT_TYPE,
    "contacts",
    {
      inputs: [toAssociationInput(trainingId, contactId, toSpec)],
    },
  );
}

export async function convertRegistrantsToStudents(
  trainingId: string,
  contactIds: string[],
  contactsById: Map<string, TrainingContact>,
): Promise<ContactUpdateResult[]> {
  await getAssociationLabelSpecs();

  const results: ContactUpdateResult[] = [];

  for (const contactId of contactIds) {
    const contact = contactsById.get(contactId);
    const name = contact
      ? `${contact.firstName} ${contact.lastName}`.trim() || contact.email
      : contactId;

    try {
      if (!contact) {
        throw new Error("Contact not found in the current training list");
      }
      if (!contact.selectable) {
        throw new Error("Contact is not a registrant");
      }

      const associations = await listAllAssociatedContacts(trainingId);
      const row = associations.find((item) => item.toObjectId === contactId);
      if (!row || !contactHasLabel(row.associationTypes, "registrant")) {
        throw new Error("Contact no longer has the registrant label");
      }

      await relabelContact(trainingId, contactId, "registrant", "student");
      results.push({
        contactId,
        name,
        success: true,
        message: "Updated to student",
      });
    } catch (error) {
      results.push({
        contactId,
        name,
        success: false,
        message: error instanceof Error ? error.message : "Update failed",
      });
    }
  }

  return results;
}

export async function revertStudentsToRegistrants(
  trainingId: string,
  contactIds: string[],
  contactsById: Map<string, TrainingContact>,
): Promise<ContactUpdateResult[]> {
  await getAssociationLabelSpecs();

  const results: ContactUpdateResult[] = [];

  for (const contactId of contactIds) {
    const contact = contactsById.get(contactId);
    const name = contact
      ? `${contact.firstName} ${contact.lastName}`.trim() || contact.email
      : contactId;

    try {
      await relabelContact(trainingId, contactId, "student", "registrant");
      results.push({
        contactId,
        name,
        success: true,
        message: "Reverted to registrant",
      });
    } catch (error) {
      results.push({
        contactId,
        name,
        success: false,
        message: error instanceof Error ? error.message : "Undo failed",
      });
    }
  }

  return results;
}
