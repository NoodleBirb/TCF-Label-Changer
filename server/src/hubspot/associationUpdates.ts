import { AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/associations/v4/models/AssociationSpec.js";
import {
  CONTACT_OBJECT_TYPE,
  TRAINING_OBJECT_TYPE,
  type AssociationLabelKey,
} from "./domainConfig.js";
import { getHubSpotClient } from "./client.js";
import {
  contactHasLabel,
  getLabelSpec,
  type AssociationType,
} from "./associationLabels.js";

export function normalizeRecordId(id: string | number): string {
  return String(id);
}

function toAssociationSpec(type: AssociationType) {
  return {
    associationCategory: type.category as AssociationSpecAssociationCategoryEnum,
    associationTypeId: type.typeId,
  };
}

export async function getAssociationTypesForContact(
  trainingId: string,
  contactId: string,
): Promise<AssociationType[]> {
  const hubspot = getHubSpotClient();
  const page = await hubspot.crm.associations.v4.basicApi.getPage(
    TRAINING_OBJECT_TYPE,
    trainingId,
    CONTACT_OBJECT_TYPE,
    undefined,
    100,
  );

  const row = page.results.find(
    (association) =>
      normalizeRecordId(association.toObjectId) === normalizeRecordId(contactId),
  );

  return row?.associationTypes ?? [];
}

function extractHubSpotError(error: unknown): string {
  if (error instanceof Error) {
    const body = (error as { body?: { message?: string } }).body;
    if (body?.message) {
      return body.message;
    }
    return error.message;
  }
  return "Association update failed";
}

export async function replaceAssociationLabel(
  trainingId: string,
  contactId: string,
  toLabel: AssociationLabelKey,
): Promise<void> {
  const hubspot = getHubSpotClient();
  const toSpec = await getLabelSpec(toLabel);

  await hubspot.crm.associations.v4.basicApi.create(
    TRAINING_OBJECT_TYPE,
    trainingId,
    CONTACT_OBJECT_TYPE,
    normalizeRecordId(contactId),
    [
      {
        associationCategory: toSpec.associationCategory,
        associationTypeId: toSpec.associationTypeId,
      },
    ],
  );

  const updatedTypes = await getAssociationTypesForContact(trainingId, contactId);
  if (!contactHasLabel(updatedTypes, toLabel)) {
    throw new Error(`HubSpot did not apply the ${toLabel} label`);
  }
}

export async function relabelContactAssociation(
  trainingId: string,
  contactId: string,
  fromLabel: AssociationLabelKey,
  toLabel: AssociationLabelKey,
): Promise<void> {
  const currentTypes = await getAssociationTypesForContact(trainingId, contactId);

  if (!contactHasLabel(currentTypes, fromLabel)) {
    throw new Error(`Contact does not have the ${fromLabel} label`);
  }

  try {
    await replaceAssociationLabel(trainingId, contactId, toLabel);
    return;
  } catch (putError) {
    const hubspot = getHubSpotClient();
    const fromSpec = await getLabelSpec(fromLabel);
    const toSpec = await getLabelSpec(toLabel);
    const fromType =
      currentTypes.find((type) => contactHasLabel([type], fromLabel)) ??
      ({
        category: fromSpec.associationCategory,
        typeId: fromSpec.associationTypeId,
      } as AssociationType);

    try {
      await hubspot.crm.associations.v4.batchApi.archiveLabels(
        TRAINING_OBJECT_TYPE,
        CONTACT_OBJECT_TYPE,
        {
          inputs: [
            {
              _from: { id: normalizeRecordId(trainingId) },
              to: { id: normalizeRecordId(contactId) },
              types: [toAssociationSpec(fromType)],
            },
          ],
        },
      );

      await hubspot.crm.associations.v4.basicApi.create(
        TRAINING_OBJECT_TYPE,
        trainingId,
        CONTACT_OBJECT_TYPE,
        normalizeRecordId(contactId),
        [
          {
            associationCategory: toSpec.associationCategory,
            associationTypeId: toSpec.associationTypeId,
          },
        ],
      );

      const updatedTypes = await getAssociationTypesForContact(
        trainingId,
        contactId,
      );
      if (!contactHasLabel(updatedTypes, toLabel)) {
        throw putError;
      }
    } catch (fallbackError) {
      throw new Error(extractHubSpotError(fallbackError));
    }
  }
}
