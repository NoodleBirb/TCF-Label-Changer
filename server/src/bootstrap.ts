/** Runs before other app modules so packaged builds use production mode. */
import { isSea } from "node:sea";

if (isSea() || "pkg" in process) {
  process.env.NODE_ENV ??= "production";
}
