# CodeGoat UI

This package hosts the React client for the CodeGoat platform. It is built with Vite and
TypeScript and now includes an Electron wrapper for desktop distribution.

## Development

```bash
# Install dependencies (run once)
npm install

# Start the Vite dev server only
npm run dev

# Start the UI inside Electron (requires backend running on localhost:3000)
npm run dev:electron
```

> **Heads-up:** The Electron dev script starts the Vite dev server and launches Electron once the
> renderer is available. The backend API must already be running (e.g., from the repository root:
> `npm run dev`).

## Building

```bash
# Build the browser bundle
npm run build

# Build the Electron desktop package (requires backend build in ../dist)
npm run build:electron
```

The Electron build produces output in `dist-electron/`. Before creating a desktop build you should
compile the backend API from the repository root:

```bash
npm run build            # from repository root
cd ui && npm run build   # UI bundle
npm run build:electron   # Electron distributable
```

## Project Structure

```
ui/
├─ electron/          # Electron main & preload scripts
├─ public/            # Static assets served by Vite
├─ src/               # React application source
├─ dist/              # Built renderer bundle (generated)
└─ dist-electron/     # Electron packaging output (generated)
```

