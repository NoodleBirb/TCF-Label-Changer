import { execSync } from "node:child_process";
import {
  copyFileSync,
  cpSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseRoot = path.join(root, "release");
const releaseDir = path.join(releaseRoot, "TCFLabelChange");
const exePath = path.join(releaseDir, "TCFLabelChange.exe");
const seaConfigPath = path.join(root, "sea-config.json");
const seaBlobPath = path.join(root, "sea-prep.blob");

rmSync(releaseRoot, { recursive: true, force: true });
mkdirSync(releaseDir, { recursive: true });

writeFileSync(
  seaConfigPath,
  JSON.stringify(
    {
      main: "server/dist-bundle/index.cjs",
      output: "sea-prep.blob",
      disableExperimentalSEAWarning: true,
      useSnapshot: false,
    },
    null,
    2,
  ),
);

console.log("Preparing single-executable blob...");
execSync("node --experimental-sea-config sea-config.json", {
  cwd: root,
  stdio: "inherit",
});

console.log("Creating Windows executable from Node binary...");
copyFileSync(process.execPath, exePath);

console.log("Injecting application into executable...");
execSync(
  `npx postject "${exePath}" NODE_SEA_BLOB "${seaBlobPath}" --sentinel-fuse NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2 copy`,
  { cwd: root, stdio: "inherit" },
);

console.log("Copying client build...");
cpSync(path.join(root, "client", "dist"), path.join(releaseDir, "client", "dist"), {
  recursive: true,
});

copyFileSync(path.join(root, ".env.example"), path.join(releaseDir, ".env.example"));

writeFileSync(
  path.join(releaseDir, "README.txt"),
  `TCF Label Change
================

1. Copy .env.example to .env in this folder.
2. Add your HubSpot private app token to .env.
3. Double-click TCFLabelChange.exe.
4. Your browser will open automatically. Keep the console window open.

To stop the app, close the console window.
`,
  "utf8",
);

console.log(`\nRelease folder ready: ${releaseDir}`);
