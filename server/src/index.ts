import "./bootstrap.js";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import type { Server } from "node:http";
import path from "node:path";
import { appConfig } from "./config.js";
import { apiRouter } from "./routes/api.js";

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api", apiRouter);

if (appConfig.isProduction) {
  const distPath = appConfig.clientDistPath;

  if (!fs.existsSync(distPath)) {
    console.error(
      `Client build not found at ${distPath}.\n` +
        (appConfig.isElectron
          ? "Rebuild the app — the UI assets are missing from the package."
          : 'Run "npm run build" from the project root first.'),
    );
    process.exit(1);
  }

  app.use(express.static(distPath));

  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

export function startServer(): Promise<Server> {
  return new Promise((resolve) => {
    const server = app.listen(appConfig.port, "127.0.0.1", () => {
      const mode = appConfig.isProduction ? "production" : "development";
      const url = `http://127.0.0.1:${appConfig.port}`;
      console.log(`Server running on ${url} (${mode})`);

      if (!appConfig.isProduction) {
        console.log("Run the client with: npm run dev -w client");
      }

      resolve(server);
    });
  });
}

function isDirectRun(): boolean {
  const entry = process.argv[1];
  if (!entry) {
    return false;
  }

  const normalizedEntry = path.resolve(entry);
  return (
    normalizedEntry.endsWith(`${path.sep}index.js`) ||
    normalizedEntry.endsWith(`${path.sep}index.cjs`)
  );
}

if (isDirectRun()) {
  void startServer();
}
