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
      `Client build not found at ${distPath}. Run "npm run build" from the project root first.`,
    );
    process.exit(1);
  }

  app.use(express.static(distPath));

  app.get(/^(?!\/api(?:\/|$)).*/, (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(appConfig.port, () => {
  const mode = appConfig.isProduction ? "production" : "development";
  console.log(`Server running on http://localhost:${appConfig.port} (${mode})`);

  if (!appConfig.isProduction) {
    console.log("Run the client with: npm run dev -w client");
  }
});
