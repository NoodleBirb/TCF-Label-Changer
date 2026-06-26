export const TRAINING_OBJECT_TYPE = "0-410";
export const CONTACT_OBJECT_TYPE = "contacts";

export const trainingConfig = {
  objectId: TRAINING_OBJECT_TYPE,
  nameProperty: "hs_course_name",
  pipelineProperty: "hs_pipeline",
  pipelineStageProperty: "hs_pipeline_stage",
  listProperties: ["hs_course_name", "name", "hs_pipeline", "hs_pipeline_stage"],
} as const;

export const associationLabels = {
  registrant: "registrant",
  student: "student",
  cancelled: "unregistered",
  waitlist: "waitlisted",
  unwaitlisted: "unwaitlisted",
} as const;

/** Alternate HubSpot label strings that should map to a label key. */
export const associationLabelAliases: Record<
  AssociationLabelKey,
  readonly string[]
> = {
  registrant: ["registrant"],
  student: ["student", "attendee"],
  cancelled: ["unregistered", "cancelled"],
  waitlist: ["waitlisted", "waitlist"],
  unwaitlisted: ["unwaitlisted", "unwaitlisted"],
};

export type AssociationLabelKey = keyof typeof associationLabels;

export const contactProperties = {
  firstName: "firstname",
  lastName: "lastname",
  email: "email",
} as const;

export const programs = {
  mhfa: {
    id: "mhfa",
    label: "MHFA",
    pipelineType: "9dd7104c-1ae0-402b-a194-9cc567fd6a45",
    closedPipelineStage: "1372234401",
  },
  qpr: {
    id: "qpr",
    label: "QPR",
    pipelineType: "905081238",
    closedPipelineStage: "1372235091",
  },
} as const;

export type ProgramId = keyof typeof programs;

export function isProgramId(value: string): value is ProgramId {
  return value in programs;
}

/** Labels shown in the contact list (registrant selectable, student disabled). */
export const visibleContactLabels: AssociationLabelKey[] = [
  "registrant",
  "student",
];
