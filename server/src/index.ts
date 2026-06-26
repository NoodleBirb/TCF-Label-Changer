import "./bootstrap.js";
import { execFile } from "node:child_process";
import cors from "cors";
import express from "express";
import fs from "node:fs";
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
        (appConfig.isPackaged
          ? 'Make sure the "client/dist" folder is next to TCFLabelChange.exe.'
          : 'Run "npm run build" from the project root first.'),
    );
    process.exit(1);
  }

  app.use(express.static(distPath));

  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

function openBrowser(url: string): void {
  if (process.platform === "win32") {
    execFile("cmd", ["/c", "start", "", url], { windowsHide: true }, () => {});
    return;
  }

  const command =
    process.platform === "darwin" ? "open" : "xdg-open";
  execFile(command, [url], () => {});
}

app.listen(appConfig.port, () => {
  const mode = appConfig.isProduction ? "production" : "development";
  const url = `http://localhost:${appConfig.port}`;
  console.log(`Server running on ${url} (${mode})`);

  if (!appConfig.isProduction) {
    console.log("Run the client with: npm run dev -w client");
    return;
  }

  if (appConfig.isPackaged) {
    console.log("Opening the app in your browser...");
    openBrowser(url);
    console.log("Keep this window open while using the app. Close it to stop.");
  }
});
