import { useEffect, useState } from "react";
import "./App.css";

type HubSpotStatus = {
  configured: boolean;
  connected: boolean;
  message: string;
};

function App() {
  const [hubspotStatus, setHubspotStatus] = useState<HubSpotStatus | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/hubspot/status")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Server responded with ${res.status}`);
        }
        return res.json() as Promise<HubSpotStatus>;
      })
      .then(setHubspotStatus)
      .catch((err: unknown) => {
        const message =
          err instanceof Error ? err.message : "Failed to reach the server";
        setError(message);
      });
  }, []);

  return (
    <main className="app">
      <header>
        <h1>TCF Label Change</h1>
        <p>HubSpot integration tool</p>
      </header>

      <section className="status-card">
        <h2>Connection status</h2>
        {error && <p className="status error">{error}</p>}
        {!error && !hubspotStatus && <p className="status">Checking...</p>}
        {hubspotStatus && (
          <dl>
            <div>
              <dt>Token configured</dt>
              <dd>{hubspotStatus.configured ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>HubSpot connected</dt>
              <dd>{hubspotStatus.connected ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Details</dt>
              <dd>{hubspotStatus.message}</dd>
            </div>
          </dl>
        )}
      </section>

      <p className="hint">
        Application details will appear here as development continues.
      </p>
    </main>
  );
}

export default App;
