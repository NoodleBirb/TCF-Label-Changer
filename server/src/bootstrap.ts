/** Runs before other app modules so packaged builds use production mode. */
if (process.env.ELECTRON_APP === "1") {
  process.env.NODE_ENV ??= "production";
}
