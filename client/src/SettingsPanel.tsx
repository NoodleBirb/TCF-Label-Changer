import { useEffect, useState, type FormEvent } from "react";
import { fetchMaskedToken, saveHubSpotToken } from "./api";

type SettingsPanelProps = {
  onClose: () => void;
};

export function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [masked, setMasked] = useState("");
  const [token, setToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchMaskedToken()
      .then((response) => {
        setMasked(response.masked);
      })
      .catch(() => {
        setMasked("");
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token.trim()) {
      setError("Enter a new token to update.");
      return;
    }

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const result = await saveHubSpotToken(token.trim());
      setSuccess(result.message);
      setToken("");
      const refreshed = await fetchMaskedToken();
      setMasked(refreshed.masked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update token");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-labelledby="settings-title"
        aria-modal="true"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2 id="settings-title">Settings</h2>
          <button
            type="button"
            className="button button-secondary"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <p className="hint">
          To change your HubSpot token later, open <strong>Settings</strong> from
          the main screen, paste a new token, and click <strong>Update token</strong>.
        </p>

        {!loading && masked && (
          <p className="muted">
            Current token: <code>{masked}</code>
          </p>
        )}

        <form className="setup-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field-label" htmlFor="settings-token">
            New HubSpot access token
          </label>
          <input
            id="settings-token"
            className="text-input"
            type="password"
            autoComplete="off"
            placeholder="pat-..."
            value={token}
            onChange={(event) => setToken(event.target.value)}
            disabled={submitting}
          />

          {error && <div className="banner banner-error">{error}</div>}
          {success && <div className="banner banner-success">{success}</div>}

          <button
            type="submit"
            className="button button-primary"
            disabled={submitting || !token.trim()}
          >
            {submitting ? "Updating..." : "Update token"}
          </button>
        </form>
      </div>
    </div>
  );
}
