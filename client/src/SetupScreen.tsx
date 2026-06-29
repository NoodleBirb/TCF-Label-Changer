import { useState, type FormEvent } from "react";
import { saveHubSpotToken } from "./api";

type SetupScreenProps = {
  onComplete: () => void;
};

export function SetupScreen({ onComplete }: SetupScreenProps) {
  const [token, setToken] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!token.trim()) {
      setError("Please enter your HubSpot access token.");
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await saveHubSpotToken(token.trim());
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save token");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="app setup-screen">
      <div className="setup-card">
        <h1>Welcome to TCF Label Change</h1>
        <p className="setup-lead">
          Enter your HubSpot private app access token to connect. This is only
          needed once — the app saves it on your computer for future use.
        </p>

        <form className="setup-form" onSubmit={(event) => void handleSubmit(event)}>
          <label className="field-label" htmlFor="hubspot-token">
            HubSpot access token
          </label>
          <input
            id="hubspot-token"
            className="text-input"
            type="password"
            autoComplete="off"
            placeholder="pat-..."
            value={token}
            onChange={(event) => setToken(event.target.value)}
            disabled={submitting}
          />

          {error && <div className="banner banner-error">{error}</div>}

          <button
            type="submit"
            className="button button-primary setup-submit"
            disabled={submitting || !token.trim()}
          >
            {submitting ? "Connecting..." : "Save and continue"}
          </button>
        </form>

        <div className="setup-help">
          <h2>Where do I get a token?</h2>
            <p>Contact TCF dev team to get the token.</p>
        </div>
      </div>
    </div>
  );
}
