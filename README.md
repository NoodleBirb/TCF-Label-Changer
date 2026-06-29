# TCF Label Change

A desktop app for updating HubSpot training association labels — moving contacts from **Registrant** to **Attendee** for trainings in the **Closed for Registration** pipeline stage.

Built for MHFA and QPR training programs.

## What it does

- Lists closed trainings by program (MHFA / QPR tabs)
- Shows registrants for a selected training (name + email, sorted by last name)
- Batch-updates selected contacts from Registrant → Attendee
- Undo support for the last successful batch
- Per-contact success/failure feedback
- First-run setup for the HubSpot API token (saved automatically on the computer)

## Requirements

### Development

- **Node.js 20+**

### End users

- **Windows** or **macOS** — no Node.js install required
- A HubSpot **private app access token** with CRM scopes for:
  - Courses / trainings (`0-410`)
  - Contacts (read)
  - Associations (read + write)

Create a token at: https://app.hubspot.com/l/settings/private-apps

## Development setup

1. **Clone and install**

   ```powershell
   npm install
   ```

2. **Configure environment** (development only)

   ```powershell
   copy .env.example .env
   ```

   Edit `.env` and set `HUBSPOT_ACCESS_TOKEN`.

3. **Run in development mode**

   ```powershell
   npm run dev
   ```

   - UI: http://localhost:5173
   - API: http://localhost:3001 (proxied through Vite)

4. **Run a production-style build locally**

   ```powershell
   npm run build
   npm start
   ```

   Open http://localhost:3001

5. **Run inside an Electron window (optional)**

   ```powershell
   npm run electron:dev
   ```

## Packaging as a desktop app

The app uses **Electron** and **electron-builder**. Packaged builds open in a normal app window (no terminal) and prompt for the HubSpot token on first launch.

### Build locally

**Windows portable `.exe`:**

```powershell
npm install
npm run package:win
```

Output: `release/TCFLabelChange.exe`

**macOS `.dmg`:**

```bash
npm install
npm run package:mac
```

Output: `release/TCFLabelChange.dmg`

Build on the same OS you are targeting when packaging locally — or use **GitHub Actions** (below) to build Windows and Mac from one repo.

### Build with GitHub Actions (Windows + Mac)

A workflow at `.github/workflows/release.yml` builds both platforms in parallel.

**Run manually**

1. Push this repo to GitHub.
2. Open **Actions** → **Build releases** → **Run workflow**.

**Run on release tag**

```bash
git tag v1.0.0
git push origin v1.0.0
```

**Download builds**

1. Open the completed workflow run on the Actions tab.
2. Download artifacts:
   - `TCFLabelChange-windows` — `TCFLabelChange.exe`
   - `TCFLabelChange-macos` — `TCFLabelChange.dmg`

Artifacts are kept for 30 days. Mac builds are unsigned — users may need to allow the app in System Settings or run `xattr -dr com.apple.quarantine /Applications/TCF\ Label\ Change.app`.

### For end users

**Windows**

1. Download `TCFLabelChange.exe`.
2. Double-click to run. (SmartScreen may warn on first run for unsigned apps — choose **More info** → **Run anyway**.)
3. On first launch, paste the HubSpot private app token when prompted.
4. Use the app normally. Keep it open while working.

**macOS**

1. Open `TCFLabelChange.dmg` and drag **TCF Label Change** to Applications.
2. Open the app from Applications. If macOS blocks it, allow it under **System Settings → Privacy & Security**.
3. On first launch, paste the HubSpot private app token when prompted.

**Changing the API token later**

Open **Settings** from the main screen, paste a new token, and click **Update token**.

The token is stored in the app's user data folder (not in the download file):

- Windows: `%APPDATA%\tcf-label-change\config.json`
- macOS: `~/Library/Application Support/tcf-label-change/config.json`

### Platform notes

- Re-run `npm run package:win` or `npm run package:mac` after code changes.
- End users do **not** need Node.js installed.
- **Windows:** SmartScreen may warn on first run for unsigned executables.
- **macOS:** Gatekeeper may block unsigned apps until allowed once.

## Project structure

```text
client/          React + Vite frontend
server/          Express API + HubSpot integration
electron/        Desktop shell (window + embedded server)
scripts/         Bundle and packaging scripts
release/         Generated installers (gitignored)
```

HubSpot object IDs, pipeline stages, and association labels are configured in `server/src/hubspot/domainConfig.ts`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client and server with hot reload |
| `npm run build` | Build client and compile server TypeScript |
| `npm run start` | Run production server (serves UI on port 3001) |
| `npm run electron:dev` | Dev server in an Electron window |
| `npm run package:win` | Build Windows portable `.exe` |
| `npm run package:mac` | Build macOS `.dmg` |
| `npm run lint` | Lint the client |

## Troubleshooting

**"Unexpected token '<'" / HTML instead of JSON**

- Make sure both client and server are running (`npm run dev`), or use `npm start` after `npm run build`.
- Restart the server if an old process is still bound to port 3001.

**First-run setup or token errors**

- Confirm the token is a valid HubSpot private app access token with the required CRM scopes.
- Use **Settings** in the app to enter a new token.

**No trainings in the dropdown**

- Only trainings in the **Closed for Registration** stage appear.
- Confirm the training's pipeline matches MHFA or QPR in HubSpot.

**Contacts show without names**

- Verify the token can read contact properties (`firstname`, `lastname`, `email`).

**Label update fails**

- Confirm the token has association write scopes.
- Check the per-contact error in the Results panel.
