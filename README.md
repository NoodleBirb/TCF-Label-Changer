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

## Packaging as a Windows `.exe`

The release is a folder containing a self-contained Node executable, the built UI, and a `.env` file. Distribute the **entire folder**, not just the `.exe`.

Packaging uses [Node.js Single Executable Applications](https://nodejs.org/api/single-executable-applications.html) (SEA). You need **Node.js 20+** on the machine that builds the release.

### Build the release (on your dev machine)

```powershell
npm install
npm run package
```

Output:

```text
release/TCFLabelChange/
  TCFLabelChange.exe      # self-contained server (~80MB, includes Node runtime)
  client/dist/            # web UI assets (required)
  .env.example
  README.txt
```

### Prepare for end users

1. Copy the whole `release/TCFLabelChange` folder to the user's computer (zip it for easy sharing).
2. Rename `.env.example` to `.env` inside that folder.
3. Add the HubSpot private app token to `.env`:

   ```env
   HUBSPOT_ACCESS_TOKEN=pat-...
   PORT=3001
   ```

4. Double-click **`TCFLabelChange.exe`**.
   - A console window opens — **keep it open** while using the app.
   - The app opens in the default browser at http://localhost:3001

5. To stop the app, close the console window.

### Packaging notes

- The `.exe` embeds the server only. The `client/dist` folder **must stay** next to the executable.
- The `.env` file **must stay** next to the executable.
- Re-run `npm run package` after code changes to produce an updated build.
- Windows SmartScreen may warn on first run for unsigned executables — expected for internal tools.
- End users do **not** need Node.js installed.

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
| `npm run package` | Build everything and create `release/TCFLabelChange/` (Windows `.exe`) |
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
