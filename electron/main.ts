import { app, BrowserWindow } from "electron";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(__filename);

function getAppRoot(): string {
  if (app.isPackaged) {
    return app.getAppPath();
  }

  return path.resolve(__dirname, "..");
}

async function createMainWindow(url: string): Promise<BrowserWindow> {
  const win = new BrowserWindow({
    width: 1024,
    height: 820,
    minWidth: 720,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    title: "TCF Label Change",
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  await win.loadURL(url);
  win.once("ready-to-show", () => {
    win.show();
  });

  return win;
}

async function bootstrap(): Promise<void> {
  if (process.env.ELECTRON_DEV === "1") {
    await createMainWindow("http://localhost:5173");
    return;
  }

  const appRoot = getAppRoot();
  const userData = app.getPath("userData");
  const configPath = path.join(userData, "config.json");
  const clientDistPath = path.join(appRoot, "client", "dist");
  const serverBundlePath = path.join(
    appRoot,
    "server",
    "dist-bundle",
    "index.cjs",
  );

  process.env.ELECTRON_APP = "1";
  process.env.ELECTRON_APP_ROOT = appRoot;
  process.env.NODE_ENV = "production";
  process.env.CONFIG_FILE_PATH = configPath;
  process.env.CLIENT_DIST_PATH = clientDistPath;
  process.env.PORT ??= "3001";

  const { startServer } = require(serverBundlePath) as {
    startServer: () => Promise<unknown>;
  };

  await startServer();
  await createMainWindow(`http://127.0.0.1:${process.env.PORT}`);
}

void app.whenReady().then(() => {
  bootstrap().catch((error: unknown) => {
    console.error(error);
    app.exit(1);
  });
});

app.on("window-all-closed", () => {
  app.quit();
});
