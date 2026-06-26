export type UndoBatch = {
  trainingId: string;
  items: Array<{
    contactId: string;
    name: string;
  }>;
};

let lastBatch: UndoBatch | null = null;

export function setLastBatch(batch: UndoBatch | null): void {
  lastBatch = batch;
}

export function getLastBatch(): UndoBatch | null {
  return lastBatch;
}

export function clearLastBatch(): void {
  lastBatch = null;
}
