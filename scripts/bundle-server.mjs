import * as esbuild from "esbuild";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

await esbuild.build({
  entryPoints: [path.join(root, "server", "src", "index.ts")],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: path.join(root, "server", "dist-bundle", "index.cjs"),
  logLevel: "info",
  legalComments: "none",
});

console.log("Server bundle written to server/dist-bundle/index.cjs");
