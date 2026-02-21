# Prisma Naming Conventions & Enum Alignment

Our SQLite schema uses `snake_case` column names while the Prisma client exposes `camelCase` properties. This document summarizes the conventions and tooling we rely on to keep those names (and our enums) in sync across the backend and the API layer.

## Field Mapping Rules

- Table names are mapped through `@@map` in Prisma, keeping legacy `snake_case` table identifiers intact.
- Columns that remain in `snake_case` use `@map` so Prisma models expose idiomatic `camelCase` fields.
- Whenever you add, rename, or remove mapped fields, regenerate the field-mapping exports with:
  ```bash
  npm run generate:prisma-enums
  ```
- The command produces `src/types/generated/prisma-field-mappings.ts`, which captures every `snake_case` ↔ `camelCase` mapping (including table names via the `__table` key). Import this reference when you need deterministic conversions or documentation.

## Enum Alignment

- All Prisma enums are the source of truth for status, priority, and type values.
- `npm run generate:prisma-enums` also emits `src/types/generated/prisma-enums.ts`, exposing constants (as `readonly` objects) plus union types for each enum.
- The shared re-export in `src/types/enums.ts` ensures backend routes, scripts, and UI code consume the same value set as the database.
- When you need API-friendly strings (for example serializing a Prisma enum into REST responses), import the generated constants:
  ```ts
  import { TaskStatus } from '../../types/generated/prisma-enums';

  const toApiStatus = (status: keyof typeof TaskStatus) => TaskStatus[status];
  ```
- When you introduce a new enum or update existing enum members, rerun the generator and update any downstream handling logic.

## SQLite Compatibility

- Prisma `sqlite` connectors only gained enum support in version 6.7+. Make sure local and CI environments run Prisma CLI/Studio ≥ `6.14.0` (the version pinned in `package.json`). Older CLIs (e.g. 5.x) will surface `P1012` validation errors that complain about enums being unsupported.
- If you are troubleshooting schema validation issues in Prisma Studio:
  1. Run `npx prisma --version` and confirm the global binary is at least 6.14.
  2. Reinstall the workspace dependencies (`npm install`) so the bundled Prisma CLI matches.
  3. Regenerate the client (`npx prisma generate`) before opening Studio.

## Workflow Checklist

1. Modify `prisma/schema.prisma` (tables, mapped fields, enums).
2. Run `npm run generate:prisma-enums` to refresh generated types and mappings.
3. Commit both the schema changes and generated outputs.
4. Update any API or documentation references that rely on the new fields or enum values.

Following this process keeps our Prisma models, SQL schema, and TypeScript contracts synchronized without hand-maintained duplication.
