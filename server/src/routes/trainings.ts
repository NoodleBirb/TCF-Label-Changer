import { Router, type NextFunction, type Request, type Response } from "express";
import { isHubSpotConfigured } from "../config.js";
import { isProgramId, programs } from "../hubspot/domainConfig.js";
import {
  convertRegistrantsToStudents,
  listClosedTrainings,
  listTrainingContacts,
  revertStudentsToRegistrants,
} from "../hubspot/trainings.js";
import {
  clearLastBatch,
  getLastBatch,
  setLastBatch,
} from "../services/undoStore.js";

export const trainingsRouter = Router();

function requireHubSpotConfigured(
  _req: Request,
  res: Response,
  next: NextFunction,
) {
  if (!isHubSpotConfigured()) {
    res.status(503).json({
      error: "HUBSPOT_ACCESS_TOKEN is not configured",
    });
    return;
  }
  next();
}

trainingsRouter.use(requireHubSpotConfigured);

trainingsRouter.get("/programs", (_req, res) => {
  res.json({
    programs: Object.values(programs).map((program) => ({
      id: program.id,
      label: program.label,
    })),
  });
});

trainingsRouter.get("/trainings", async (req, res) => {
  const programId = String(req.query.program ?? "");

  if (!isProgramId(programId)) {
    res.status(400).json({ error: "Invalid or missing program parameter" });
    return;
  }

  try {
    const trainings = await listClosedTrainings(programId);
    res.json({ trainings });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to load trainings",
    });
  }
});

trainingsRouter.get("/trainings/:trainingId/contacts", async (req, res) => {
  const trainingId = req.params.trainingId;
  if (!trainingId) {
    res.status(400).json({ error: "Missing training id" });
    return;
  }

  try {
    const contacts = await listTrainingContacts(trainingId);
    res.json({ contacts });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to load contacts",
    });
  }
});

trainingsRouter.post("/trainings/:trainingId/convert", async (req, res) => {
  const trainingId = req.params.trainingId;
  if (!trainingId) {
    res.status(400).json({ error: "Missing training id" });
    return;
  }

  const contactIds = Array.isArray(req.body?.contactIds)
    ? (req.body.contactIds as unknown[]).map(String)
    : [];

  if (contactIds.length === 0) {
    res.status(400).json({ error: "No contacts selected" });
    return;
  }

  try {
    const contacts = await listTrainingContacts(trainingId);
    const contactsById = new Map(
      contacts.map((contact) => [contact.id, contact]),
    );
    const results = await convertRegistrantsToStudents(
      trainingId,
      contactIds,
      contactsById,
    );

    const successfulIds = results
      .filter((result) => result.success)
      .map((result) => result.contactId);

    if (successfulIds.length > 0) {
      setLastBatch({
        trainingId,
        items: results
          .filter((result) => result.success)
          .map((result) => ({
            contactId: result.contactId,
            name: result.name,
          })),
      });
    } else {
      clearLastBatch();
    }

    res.json({
      results,
      canUndo: successfulIds.length > 0,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to update labels",
    });
  }
});

trainingsRouter.post("/undo", async (_req, res) => {
  const batch = getLastBatch();
  if (!batch) {
    res.status(400).json({ error: "Nothing to undo" });
    return;
  }

  try {
    const contacts = await listTrainingContacts(batch.trainingId);
    const contactsById = new Map(
      contacts.map((contact) => [contact.id, contact]),
    );

    const results = await revertStudentsToRegistrants(
      batch.trainingId,
      batch.items.map((item) => item.contactId),
      contactsById,
    );

    clearLastBatch();

    res.json({
      results,
      canUndo: false,
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to undo",
    });
  }
});

trainingsRouter.get("/undo", (_req, res) => {
  const batch = getLastBatch();
  res.json({
    canUndo: batch !== null,
    batch,
  });
});
