import type {
  ConvertResponse,
  Program,
  Training,
  TrainingContact,
  UndoStatus,
} from "./types";

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.includes("application/json")) {
    if (text.trimStart().startsWith("<!")) {
      throw new Error(
        "Received HTML instead of JSON from the API. Make sure the server is running (npm run dev) and restart it after pulling updates.",
      );
    }
    throw new Error(`Expected JSON but received ${contentType || "unknown content"}`);
  }

  let body: T;
  try {
    body = JSON.parse(text) as T;
  } catch {
    throw new Error("Server returned invalid JSON");
  }

  if (!response.ok) {
    const message =
      typeof body === "object" &&
      body !== null &&
      "error" in body &&
      typeof (body as { error?: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${response.status})`;
    throw new Error(message);
  }

  return body;
}

export async function fetchPrograms(): Promise<{ programs: Program[] }> {
  const response = await fetch("/api/programs");
  return parseJson(response);
}

export async function fetchTrainings(
  programId: string,
): Promise<{ trainings: Training[] }> {
  const response = await fetch(
    `/api/trainings?program=${encodeURIComponent(programId)}`,
  );
  return parseJson(response);
}

export async function fetchTrainingContacts(
  trainingId: string,
): Promise<{ contacts: TrainingContact[] }> {
  const response = await fetch(
    `/api/trainings/${encodeURIComponent(trainingId)}/contacts`,
  );
  return parseJson(response);
}

export async function convertContacts(
  trainingId: string,
  contactIds: string[],
): Promise<ConvertResponse> {
  const response = await fetch(
    `/api/trainings/${encodeURIComponent(trainingId)}/convert`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactIds }),
    },
  );
  return parseJson(response);
}

export async function fetchUndoStatus(): Promise<UndoStatus> {
  const response = await fetch("/api/undo");
  return parseJson(response);
}

export async function undoLastBatch(): Promise<ConvertResponse> {
  const response = await fetch("/api/undo", { method: "POST" });
  return parseJson(response);
}
