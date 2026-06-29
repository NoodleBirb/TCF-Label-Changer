import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  entryPoints: [path.join(root, "electron", "main.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: path.join(root, "electron", "dist", "main.cjs"),
  logLevel: "info",
  external: ["electron"],
});

console.log("Electron main written to electron/dist/main.cjs");
