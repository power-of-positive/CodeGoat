# CodeGoat Platform

CodeGoat is an end‑to‑end automation platform that orchestrates AI workers, analytics, and validation pipelines for engineering teams. The project bundles:

- **Backend API** – Express + Prisma service that manages tasks, analytics, validation runs, BDD scenarios, worker orchestration, and log streaming.
- **Modern Web UI** – React (Vite) application that exposes the Kanban board, analytics dashboards, validation history, worker consoles, and configuration tools.
- **Electron desktop shell** – Optional desktop wrapper that ships the UI with an embedded backend for an all-in-one experience.

The original proxy boilerplate has been replaced by a full analytics/orchestrator stack with SQLite persistence, Prisma migrations, and a suite of scripts that keep workers, validation runs, and backups healthy.

---

## Features Overview

| Area | Highlights |
| --- | --- |
| **Task Operations** | Kanban board with inline worker launches, commit merge helpers, execution logs, and dev-server automation. |
| **Analytics** | Validation run metrics, stage performance, historical trends, and BDD execution stats exposed via `/api/analytics/*` endpoints and rich dashboards. |
| **Worker Management** | Claude worker start/stop/merge flows, log streaming, VS Code integration, and dev server helpers. |
| **Validation Pipeline** | Structured stage configuration, retry policies, log cleanup routines, and API endpoints for validation orchestration. |
| **Tooling & Scripts** | Database backups, task seeding, proxy cleanup, worker log management, and production deployment helpers. |

---

## Repository Layout

```
codegoat/
├── prisma/                    # Prisma schema + migrations (SQLite)
├── src/                       # Express backend
│   ├── routes/                # REST endpoints (tasks, analytics, workers, validation…)
│   ├── services/              # Database and domain services
│   ├── middleware/            # Validation, pagination, error handling
│   └── utils/                 # Logging, command interception, orchestration helpers
├── ui/                        # React (Vite) frontend
│   ├── src/features           # UI modules (tasks, analytics, workers, validation)
│   ├── scripts/               # UI-specific tooling (Playwright, Cucumber, etc.)
│   └── electron/              # Electron entrypoints (main & preload)
├── scripts/                   # Node/TS scripts for seeding, backups, validation runs…
├── docs/                      # Architecture notes, audits, API deep dives
└── README.md
```

---

## Prerequisites

- Node.js 18 or newer
- npm 9+
- SQLite 3 (bundled with Prisma)
- Optional: VS Code CLI tools (for worker “Open in VS Code” action)

---

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` (or `.env.e2e`, `.env.production.example`) to `.env` and adjust:

```bash
cp .env.example .env
```

Key variables:

- `DATABASE_URL` – SQLite file (default points to `prisma/kanban.db`)
- `PORT` – Backend HTTP port
- `OPENROUTER_API_KEY`, `OPENAI_API_KEY` – Required for AI worker integrations
- `LOG_LEVEL`, `NODE_ENV` – Runtime behaviour

### 3. Apply database migrations

```bash
npx prisma migrate reset --force --skip-seed --skip-generate
npx prisma migrate dev
```

### 4. Seed local data (optional but helpful)

```bash
npx ts-node --project tsconfig.json scripts/simple-seed.ts
```

### 5. Start services

```bash
# Backend API with hot reload
npm run dev

# Frontend (Vite) UI
npm run start:ui

# Electron shell (backend + UI in one window)
npm run start:electron
```

The UI defaults to http://localhost:5173 and the API to http://localhost:3001 (configurable).

---

## Key npm Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Nodemon + ts-node backend in watch mode |
| `npm run start` | Backend in production mode (`dist`) |
| `npm run start:ui` | Vite dev server for the React app |
| `npm run start:electron` | Launch Electron shell for local development |
| `npm run build` | Compile backend TypeScript -> `dist/` |
| `npm run build:electron` | Build packaged Electron app |
| `npm run test` | Jest backend/unit suite |
| `npm run test:playwright` | UI end-to-end tests (Playwright) |
| `npm run lint` / `npm run format:check` | ESLint / Prettier guards |
| `npm run backup:*` | Database backup tooling (see `scripts/`) |

Refer to `package.json` for the full list, including validation, analytics, and worker scripts.

---

## Notable APIs

All endpoints live under `/api/*` and are documented throughout `docs/` and the Jest route tests. Highlights include:

- `/api/tasks` – Task CRUD, analytics, validation helper endpoints
- `/api/analytics/*` – Validation session metrics, stage insights, dashboards
- `/api/claude-workers/*` – Worker lifecycle, merge flows, dev server helpers
- `/api/validation-stage-configs` – Stage configuration management
- `/api/bdd-scenarios/*` – BDD scenario CRUD and execution history

Each route is validated with Zod schemas (`src/shared/schemas`) and backed by Prisma services.

---

## Worker & Validation Tooling

- **Dev Server Automation** – Trigger backend/frontend servers inside a worker worktree from the UI (Task Detail + Kanban board).
- **Merge Helpers** – Auto-generate commit messages and merge changes directly from the Task detail view.
- **Log Management** – Streaming logs, log cleanup routines, and Playwright/Cucumber integration for validation traces.

Scripts such as `scripts/clear-workers.ts`, `scripts/verify-backup-system.sh`, and `scripts/validate-task.ts` keep long-running workers and validation loops healthy.

---

## Testing & Quality

- **Unit/Route Tests** – Jest suites (`npm run test`) cover routes, services, utilities, and worker orchestration logic.
- **UI Tests** – Playwright and Cucumber (located in `ui/`) for end-to-end flows.
- **Static Analysis** – ESLint + Prettier enforcement via `npm run lint` / `npm run format:check`.
- **Type Safety** – Full TypeScript coverage across backend, frontend, and scripts.

---

## Deployment

1. Build backend and frontend artifacts:
   ```bash
   npm run build
   (cd ui && npm run build)
   ```
2. Package Electron app (optional):
   ```bash
   npm run build:electron
   ```
3. Provision the Prisma database (SQLite file can be shipped or replaced with Postgres by updating `schema.prisma` and env vars).
4. Use the deployment scripts under `deployment/` to configure systemd services, backups, and health checks.

---

## Further Reading

- `docs/api-design-review.md` – API audit and recommendations
- `docs/database-environment-audit.md` – Environment coverage & migration guidance
- `docs/workers-api-migration-plan.md` – Worker API consolidation notes
- Documentation backlog tracked in `docs/documentation-audit-summary.md`

---

## Contributing

1. Create a feature branch.
2. Run `npm run lint`, `npm run format:check`, and `npm run test` before pushing.
3. Ensure Prisma migrations are generated for any schema changes (`npx prisma migrate dev --name <change>`).
4. Update documentation when workflows or endpoints change.

Bug reports and improvement ideas are welcome via the issue tracker.

---

## License

This project is released under the MIT License. See `LICENSE` for details.
# CodeGoat
