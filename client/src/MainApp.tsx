import { useCallback, useEffect, useMemo, useState } from "react";
import {
  convertContacts,
  fetchPrograms,
  fetchTrainingContacts,
  fetchTrainings,
  fetchUndoStatus,
  undoLastBatch,
} from "./api";
import { SettingsPanel } from "./SettingsPanel";
import type { ContactUpdateResult, Program, Training, TrainingContact } from "./types";

function formatName(contact: TrainingContact): string {
  const name = `${contact.firstName} ${contact.lastName}`.trim();
  return name || contact.email || "Unknown contact";
}

function labelDisplay(label: string): string {
  if (label === "student") {
    return "Attendee";
  }
  return label.charAt(0).toUpperCase() + label.slice(1);
}

type MainAppProps = {
  supportsSetup: boolean;
};

export function MainApp({ supportsSetup }: MainAppProps) {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [activeProgram, setActiveProgram] = useState<string>("");
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [selectedTrainingId, setSelectedTrainingId] = useState("");
  const [contacts, setContacts] = useState<TrainingContact[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ContactUpdateResult[] | null>(null);
  const [canUndo, setCanUndo] = useState(false);
  const [loadingPrograms, setLoadingPrograms] = useState(true);
  const [loadingTrainings, setLoadingTrainings] = useState(false);
  const [loadingContacts, setLoadingContacts] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [undoing, setUndoing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const selectableContacts = useMemo(
    () => contacts.filter((contact) => contact.selectable),
    [contacts],
  );

  const allSelected =
    selectableContacts.length > 0 &&
    selectableContacts.every((contact) => selectedIds.has(contact.id));

  const loadPrograms = useCallback(async () => {
    setLoadingPrograms(true);
    setError(null);
    try {
      const response = await fetchPrograms();
      setPrograms(response.programs);
      if (response.programs[0]) {
        setActiveProgram(response.programs[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load programs");
    } finally {
      setLoadingPrograms(false);
    }
  }, []);

  const refreshUndoStatus = useCallback(async () => {
    try {
      const status = await fetchUndoStatus();
      setCanUndo(status.canUndo);
    } catch {
      setCanUndo(false);
    }
  }, []);

  useEffect(() => {
    void loadPrograms();
    void refreshUndoStatus();
  }, [loadPrograms, refreshUndoStatus]);

  useEffect(() => {
    if (!activeProgram) {
      return;
    }

    setLoadingTrainings(true);
    setError(null);
    setSelectedTrainingId("");
    setContacts([]);
    setSelectedIds(new Set());
    setResults(null);

    fetchTrainings(activeProgram)
      .then((response) => {
        setTrainings(response.trainings);
      })
      .catch((err: unknown) => {
        setTrainings([]);
        setError(
          err instanceof Error ? err.message : "Failed to load trainings",
        );
      })
      .finally(() => {
        setLoadingTrainings(false);
      });
  }, [activeProgram]);

  useEffect(() => {
    if (!selectedTrainingId) {
      setContacts([]);
      setSelectedIds(new Set());
      return;
    }

    setLoadingContacts(true);
    setError(null);
    setResults(null);

    fetchTrainingContacts(selectedTrainingId)
      .then((response) => {
        setContacts(response.contacts);
        setSelectedIds(new Set());
      })
      .catch((err: unknown) => {
        setContacts([]);
        setError(
          err instanceof Error ? err.message : "Failed to load contacts",
        );
      })
      .finally(() => {
        setLoadingContacts(false);
      });
  }, [selectedTrainingId]);

  function toggleContact(contactId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(contactId)) {
        next.delete(contactId);
      } else {
        next.add(contactId);
      }
      return next;
    });
  }

  function toggleSelectAll() {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(selectableContacts.map((contact) => contact.id)));
  }

  async function handleSubmit() {
    if (!selectedTrainingId || selectedIds.size === 0) {
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await convertContacts(
        selectedTrainingId,
        Array.from(selectedIds),
      );
      setResults(response.results);
      setCanUndo(response.canUndo);
      const refreshed = await fetchTrainingContacts(selectedTrainingId);
      setContacts(refreshed.contacts);
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update contacts");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUndo() {
    setUndoing(true);
    setError(null);

    try {
      const response = await undoLastBatch();
      setResults(response.results);
      setCanUndo(false);
      if (selectedTrainingId) {
        const refreshed = await fetchTrainingContacts(selectedTrainingId);
        setContacts(refreshed.contacts);
      }
      setSelectedIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to undo");
    } finally {
      setUndoing(false);
    }
  }

  return (
    <div className="app">
      <header className="app-header">
        <div>
          <h1>TCF Label Change</h1>
          <p>Move registrants to attendees for trainings closed for registration</p>
        </div>
        <div className="header-actions">
          {supportsSetup && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => setShowSettings(true)}
            >
              Settings
            </button>
          )}
          {canUndo && (
            <button
              type="button"
              className="button button-secondary"
              onClick={() => void handleUndo()}
              disabled={undoing}
            >
              {undoing ? "Undoing..." : "Undo last update"}
            </button>
          )}
        </div>
      </header>

      {error && <div className="banner banner-error">{error}</div>}

      <nav className="tabs" aria-label="Training programs">
        {loadingPrograms && <span className="muted">Loading programs...</span>}
        {programs.map((program) => (
          <button
            key={program.id}
            type="button"
            className={`tab ${activeProgram === program.id ? "tab-active" : ""}`}
            onClick={() => setActiveProgram(program.id)}
          >
            {program.label}
          </button>
        ))}
      </nav>

      <section className="panel">
        <label className="field-label" htmlFor="training-select">
          Training
        </label>
        <select
          id="training-select"
          className="select"
          value={selectedTrainingId}
          onChange={(event) => setSelectedTrainingId(event.target.value)}
          disabled={loadingTrainings || trainings.length === 0}
        >
          <option value="">
            {loadingTrainings
              ? "Loading trainings..."
              : trainings.length === 0
                ? "No trainings closed for registration"
                : "Select a training"}
          </option>
          {trainings.map((training) => (
            <option key={training.id} value={training.id}>
              {training.name}
            </option>
          ))}
        </select>
        <p className="hint">
          Only trainings in the Closed for Registration pipeline stage are shown.
        </p>
      </section>

      {selectedTrainingId && (
        <section className="panel">
          <div className="panel-header">
            <h2>Contacts</h2>
            {selectableContacts.length > 0 && (
              <label className="select-all">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                />
                Select all registrants
              </label>
            )}
          </div>

          {loadingContacts && <p className="muted">Loading contacts...</p>}

          {!loadingContacts && contacts.length === 0 && (
            <p className="muted">No registrants or attendees for this training.</p>
          )}

          {!loadingContacts && contacts.length > 0 && (
            <ul className="contact-list">
              {contacts.map((contact) => (
                <li
                  key={contact.id}
                  className={`contact-row ${contact.selectable ? "" : "contact-row-disabled"}`}
                >
                  <label className="contact-label">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(contact.id)}
                      disabled={!contact.selectable}
                      onChange={() => toggleContact(contact.id)}
                    />
                    <span className="contact-info">
                      <span className="contact-name">{formatName(contact)}</span>
                      <span className="contact-email">{contact.email}</span>
                    </span>
                    <span
                      className={`badge ${contact.label === "student" ? "badge-student" : "badge-registrant"}`}
                    >
                      {labelDisplay(contact.label)}
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="actions">
            <button
              type="button"
              className="button button-primary"
              disabled={
                submitting || selectedIds.size === 0 || loadingContacts
              }
              onClick={() => void handleSubmit()}
            >
              {submitting
                ? "Updating..."
                : `Update ${selectedIds.size} selected`}
            </button>
          </div>
        </section>
      )}

      {results && (
        <section className="panel">
          <h2>Results</h2>
          <ul className="results-list">
            {results.map((result) => (
              <li
                key={result.contactId}
                className={result.success ? "result-ok" : "result-error"}
              >
                <strong>{result.name}</strong>
                <span>{result.message}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {showSettings && (
        <SettingsPanel onClose={() => setShowSettings(false)} />
      )}
    </div>
  );
}
