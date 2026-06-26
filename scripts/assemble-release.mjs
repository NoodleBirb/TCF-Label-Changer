import { execSync } from "node:child_process";
import {
  chmodSync,
  copyFileSync,
  cpSync,
  mkdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SEA_FUSE = "NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const releaseRoot = path.join(root, "release");
const releaseDir = path.join(releaseRoot, "TCFLabelChange");
const seaConfigPath = path.join(root, "sea-config.json");
const seaBlobPath = path.join(root, "sea-prep.blob");

const platform = process.platform;

const targets = {
  win32: {
    label: "Windows",
    binaryName: "TCFLabelChange.exe",
    launchHint: "Double-click TCFLabelChange.exe.",
    extraNotes: [
      "Windows SmartScreen may warn on first run for unsigned executables.",
    ],
  },
  darwin: {
    label: "macOS",
    binaryName: "TCFLabelChange",
    launchHint:
      "Double-click TCFLabelChange, or run ./TCFLabelChange from Terminal in this folder.",
    extraNotes: [
      "If macOS blocks the app, run: xattr -dr com.apple.quarantine TCFLabelChange",
      "You may need to allow the app under System Settings → Privacy & Security.",
    ],
  },
  linux: {
    label: "Linux",
    binaryName: "TCFLabelChange",
    launchHint: "Run ./TCFLabelChange from Terminal in this folder.",
    extraNotes: [],
  },
};

const target = targets[platform];

if (!target) {
  console.error(
    `Unsupported packaging platform: ${platform}. Build on Windows, macOS, or Linux.`,
  );
  process.exit(1);
}

const binaryPath = path.join(releaseDir, target.binaryName);

function injectSeaBlob() {
  const postjectArgs = [
    "npx",
    "postject",
    `"${binaryPath}"`,
    "NODE_SEA_BLOB",
    `"${seaBlobPath}"`,
    `--sentinel-fuse ${SEA_FUSE}`,
  ];

  if (platform === "darwin") {
    postjectArgs.push("--macho-segment-name NODE_SEA");
  }

  postjectArgs.push("copy");

  execSync(postjectArgs.join(" "), { cwd: root, stdio: "inherit", shell: true });
}

function buildReadme() {
  const extraNotes =
    target.extraNotes.length > 0
      ? `\nNotes:\n${target.extraNotes.map((note) => `- ${note}`).join("\n")}\n`
      : "";

  return `TCF Label Change
================

1. Copy .env.example to .env in this folder.
2. Add your HubSpot private app token to .env.
3. ${target.launchHint}
4. Your browser should open automatically. Keep the app window/terminal open.

To stop the app, close the terminal window or press Ctrl+C in Terminal.
${extraNotes}`;
}

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

console.log(`Preparing single-executable blob (${target.label})...`);
execSync("node --experimental-sea-config sea-config.json", {
  cwd: root,
  stdio: "inherit",
});

console.log(`Creating ${target.label} executable from Node binary...`);
copyFileSync(process.execPath, binaryPath);

if (platform !== "win32") {
  chmodSync(binaryPath, 0o755);
}

console.log("Injecting application into executable...");
injectSeaBlob();

console.log("Copying client build...");
cpSync(path.join(root, "client", "dist"), path.join(releaseDir, "client", "dist"), {
  recursive: true,
});

copyFileSync(path.join(root, ".env.example"), path.join(releaseDir, ".env.example"));

writeFileSync(path.join(releaseDir, "README.txt"), buildReadme(), "utf8");

console.log(`\n${target.label} release folder ready: ${releaseDir}`);
