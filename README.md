# TCF Label Change

A local web app for updating HubSpot training association labels — moving contacts from **Registrant** to **Attendee** for trainings in the **Closed for Registration** pipeline stage.

Built for MHFA and QPR training programs.

## What it does

- Lists closed trainings by program (MHFA / QPR tabs)
- Shows registrants for a selected training (name + email, sorted by last name)
- Batch-updates selected contacts from Registrant → Attendee
- Undo support for the last successful batch
- Per-contact success/failure feedback

## Requirements

- **Node.js 20+** (development and building only — end users running the `.exe` do not need Node)
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

2. **Configure environment**

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

## Packaging as a standalone app

The release is a folder containing a self-contained Node executable, the built UI, and a `.env` file. Distribute the **entire folder**, not just the executable.

Packaging uses [Node.js Single Executable Applications](https://nodejs.org/api/single-executable-applications.html) (SEA). You need **Node.js 20+** on the machine that builds the release.

**Build on the same OS you are targeting** when packaging locally — or use **GitHub Actions** (below) to build Windows and Mac from one repo without a Mac on your desk.

### Build locally

```bash
npm install
npm run package
```

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
   - `TCFLabelChange-windows` — contains `TCFLabelChange.exe`
   - `TCFLabelChange-macos` — contains `TCFLabelChange`

Each artifact is the full `release/TCFLabelChange` folder (executable, `client/dist`, `.env.example`, `README.txt`). Unzip, add `.env`, and distribute.

Artifacts are kept for 30 days. Mac builds are unsigned — users may need to allow the app in System Settings or run `xattr -dr com.apple.quarantine TCFLabelChange`.

### Release output (`release/TCFLabelChange/`)

| Platform | Executable | Notes |
|----------|------------|-------|
| Windows | `TCFLabelChange.exe` | Double-click to run |
| macOS | `TCFLabelChange` | Double-click or `./TCFLabelChange` in Terminal |
| Linux | `TCFLabelChange` | `./TCFLabelChange` in Terminal |

All releases also include:

```text
client/dist/            # web UI assets (required)
.env.example
README.txt
```

### Prepare for end users

1. Copy the whole `release/TCFLabelChange` folder to the user's computer (zip it for sharing).
2. Rename `.env.example` to `.env` inside that folder.
3. Add the HubSpot private app token to `.env`:

   ```env
   HUBSPOT_ACCESS_TOKEN=pat-...
   PORT=3001
   ```

4. Launch the app:
   - **Windows:** double-click `TCFLabelChange.exe`
   - **macOS:** double-click `TCFLabelChange`, or run `./TCFLabelChange` from Terminal
   - **Linux:** run `./TCFLabelChange` from Terminal

   Keep the terminal/console window open while using the app. The browser opens at http://localhost:3001

5. To stop the app, close the terminal window (or press Ctrl+C).

### Platform notes

- The executable embeds the server only. The `client/dist` folder **must stay** next to it.
- The `.env` file **must stay** next to the executable.
- Re-run `npm run package` after code changes to produce an updated build.
- End users do **not** need Node.js installed.
- **Windows:** SmartScreen may warn on first run for unsigned executables.
- **macOS:** If blocked, run `xattr -dr com.apple.quarantine TCFLabelChange` in the app folder, or allow it under System Settings → Privacy & Security.

## Project structure

```text
client/          React + Vite frontend
server/          Express API + HubSpot integration
scripts/         Bundle and packaging scripts
release/         Generated distributable (gitignored)
```

HubSpot object IDs, pipeline stages, and association labels are configured in `server/src/hubspot/domainConfig.ts`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start client and server with hot reload |
| `npm run build` | Build client and compile server TypeScript |
| `npm run start` | Run production server (serves UI on port 3001) |
| `npm run package` | Build standalone app for the current OS (`release/TCFLabelChange/`) |
| `npm run lint` | Lint the client |

## Troubleshooting

**"Unexpected token '<'" / HTML instead of JSON**

- Make sure both client and server are running (`npm run dev`), or use `npm start` after `npm run build`.
- Restart the server if an old process is still bound to port 3001.

**No trainings in the dropdown**

- Only trainings in the **Closed for Registration** stage appear.
- Confirm the training's pipeline matches MHFA or QPR in HubSpot.

**Contacts show without names**

- Verify the token can read contact properties (`firstname`, `lastname`, `email`).

**Label update fails**

- Confirm the token has association write scopes.
- Check the per-contact error in the Results panel.
