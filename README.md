# Anthrop

Next.js 16 modular-monolith application for real estate workflows.

## Getting Started

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Project Structure

- `src/app`: routing, layouts, API routes
- `src/modules`: domain modules
- `src/shared`: reusable UI/lib/config/types/form
- `src/infrastructure`: db/cache/observability
- `src/scripts`: operational scripts

Main marketing page entry is at `src/app/(marketing)/page.tsx`.

## Database

- Drizzle schema: `src/infrastructure/db/schema/index.ts`
- Drizzle migrations: `src/infrastructure/db/migrations`
- Drizzle config: `drizzle.config.ts`

## Useful Commands

```bash
npm run dev
npm run build
npm run db:generate
npm run db:migrate
npm run db:studio
npx tsc --noEmit
```

## Architecture Docs

- `docs/architecture/modular-monolith.md`
- `docs/architecture/path-migration-map.md`
- `docs/schema-reference.md`