export type Program = {
  id: string;
  label: string;
};

export type Training = {
  id: string;
  name: string;
};

export type TrainingContact = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  label: string;
  selectable: boolean;
};

export type ContactUpdateResult = {
  contactId: string;
  name: string;
  success: boolean;
  message: string;
};

export type ConvertResponse = {
  results: ContactUpdateResult[];
  canUndo: boolean;
};

export type UndoStatus = {
  canUndo: boolean;
  batch: {
    trainingId: string;
    items: Array<{ contactId: string; name: string }>;
  } | null;
};
