import { useCallback, useEffect, useState } from "react";
import { fetchSetupStatus } from "./api";
import { MainApp } from "./MainApp";
import { SetupScreen } from "./SetupScreen";
import "./App.css";

function App() {
  const [appReady, setAppReady] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [supportsSetup, setSupportsSetup] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const initializeApp = useCallback(async () => {
    setError(null);
    try {
      const setup = await fetchSetupStatus();
      setSupportsSetup(setup.supportsSetup);

      if (!setup.configured || !setup.connected) {
        if (setup.supportsSetup) {
          setNeedsSetup(true);
          setAppReady(true);
          return;
        }

        setError(setup.message);
        setAppReady(true);
        return;
      }

      setNeedsSetup(false);
      setAppReady(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start app");
      setAppReady(true);
    }
  }, []);

  useEffect(() => {
    void initializeApp();
  }, [initializeApp]);

  function handleSetupComplete() {
    setNeedsSetup(false);
    setError(null);
  }

  if (!appReady) {
    return (
      <div className="app">
        <p className="muted">Loading...</p>
      </div>
    );
  }

  if (needsSetup) {
    return <SetupScreen onComplete={handleSetupComplete} />;
  }

  if (error) {
    return (
      <div className="app">
        <div className="banner banner-error">{error}</div>
      </div>
    );
  }

  return <MainApp supportsSetup={supportsSetup} />;
}

export default App;
