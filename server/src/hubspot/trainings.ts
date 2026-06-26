import { FilterOperatorEnum } from "@hubspot/api-client/lib/codegen/crm/objects/models/Filter.js";
import type { ProgramId } from "./domainConfig.js";
import {
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
  type AssociationType,
} from "./associationLabels.js";
import {
  getAssociationTypesForContact,
  normalizeRecordId,
  relabelContactAssociation,
} from "./associationUpdates.js";
import { fetchContactDetailsByIds, formatContactName } from "./contacts.js";

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

  const detailsById = await fetchContactDetailsByIds(
    visible.map((row) => row.toObjectId),
  );

  const contacts: TrainingContact[] = visible.map((row) => {
    const label = getContactLabelKey(row.associationTypes)!;
    const contactId = normalizeRecordId(row.toObjectId);
    const details = detailsById.get(contactId) ?? {
      firstName: "",
      lastName: "",
      email: "",
    };

    return {
      id: contactId,
      firstName: details.firstName,
      lastName: details.lastName,
      email: details.email,
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
      ? formatContactName(contact) || contactId
      : contactId;

    try {
      if (!contact) {
        throw new Error("Contact not found in the current training list");
      }
      if (!contact.selectable) {
        throw new Error("Contact is not a registrant");
      }

      const associationTypes = await getAssociationTypesForContact(
        trainingId,
        contactId,
      );
      if (!contactHasLabel(associationTypes, "registrant")) {
        throw new Error("Contact no longer has the registrant label");
      }

      await relabelContactAssociation(
        trainingId,
        contactId,
        "registrant",
        "student",
      );
      results.push({
        contactId,
        name,
        success: true,
        message: "Updated to attendee",
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
      ? formatContactName(contact) || contactId
      : contactId;

    try {
      await relabelContactAssociation(
        trainingId,
        contactId,
        "student",
        "registrant",
      );
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
