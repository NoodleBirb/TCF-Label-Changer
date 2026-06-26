import { AssociationSpecAssociationCategoryEnum } from "@hubspot/api-client/lib/codegen/crm/associations/v4/models/AssociationSpec.js";
import {
  associationLabelAliases,
  associationLabels,
  CONTACT_OBJECT_TYPE,
  TRAINING_OBJECT_TYPE,
  type AssociationLabelKey,
} from "./domainConfig.js";
import { getHubSpotClient } from "./client.js";

export type AssociationType = {
  label?: string;
  category: string;
  typeId: number;
};

export type ResolvedAssociationSpec = {
  associationCategory: AssociationSpecAssociationCategoryEnum;
  associationTypeId: number;
  internalName: string;
};

let labelSpecCache: Map<string, ResolvedAssociationSpec> | null = null;

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_");
}

export async function getAssociationLabelSpecs(): Promise<
  Map<string, ResolvedAssociationSpec>
> {
  if (labelSpecCache) {
    return labelSpecCache;
  }

  const hubspot = getHubSpotClient();
  const response =
    await hubspot.crm.associations.v4.schema.definitionsApi.getAll(
      TRAINING_OBJECT_TYPE,
      CONTACT_OBJECT_TYPE,
    );

  const byInternalName = new Map<string, ResolvedAssociationSpec>();

  for (const spec of response.results) {
    if (!spec.label) {
      continue;
    }

    const normalizedLabel = normalizeLabel(spec.label);
    const resolved: ResolvedAssociationSpec = {
      associationCategory:
        spec.category as unknown as AssociationSpecAssociationCategoryEnum,
      associationTypeId: spec.typeId,
      internalName: normalizedLabel,
    };

    byInternalName.set(normalizedLabel, resolved);

    for (const [key, aliases] of Object.entries(associationLabelAliases)) {
      if (aliases.some((alias) => normalizeLabel(alias) === normalizedLabel)) {
        byInternalName.set(key, { ...resolved, internalName: normalizedLabel });
      }
    }
  }

  for (const [key, internalName] of Object.entries(associationLabels)) {
    if (byInternalName.has(key)) {
      continue;
    }

    const resolved =
      byInternalName.get(normalizeLabel(internalName)) ??
      [...byInternalName.values()].find((spec) =>
        associationLabelAliases[key as AssociationLabelKey].some(
          (alias) => normalizeLabel(alias) === spec.internalName,
        ),
      );

    if (!resolved) {
      throw new Error(
        `HubSpot association label "${internalName}" (${key}) was not found for ${TRAINING_OBJECT_TYPE} → ${CONTACT_OBJECT_TYPE}`,
      );
    }
    byInternalName.set(key, resolved);
  }

  labelSpecCache = byInternalName;
  return byInternalName;
}

export async function getLabelSpec(
  key: AssociationLabelKey,
): Promise<ResolvedAssociationSpec> {
  const specs = await getAssociationLabelSpecs();
  const spec = specs.get(key);
  if (!spec) {
    throw new Error(`Association label spec missing for "${key}"`);
  }
  return spec;
}

function matchesLabelKey(
  label: string | undefined,
  labelKey: AssociationLabelKey,
): boolean {
  if (!label) {
    return false;
  }
  const normalized = normalizeLabel(label);
  return associationLabelAliases[labelKey].some(
    (alias) => normalizeLabel(alias) === normalized,
  );
}

export function contactHasLabel(
  associationTypes: AssociationType[],
  labelKey: AssociationLabelKey,
): boolean {
  return associationTypes.some((type) => matchesLabelKey(type.label, labelKey));
}

export function getContactLabelKey(
  associationTypes: AssociationType[],
): AssociationLabelKey | null {
  for (const [key, internalName] of Object.entries(associationLabels)) {
    if (contactHasLabel(associationTypes, key as AssociationLabelKey)) {
      return key as AssociationLabelKey;
    }
  }
  return null;
}
