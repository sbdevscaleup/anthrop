# Repo Map and Source of Truth

Last updated: 2026-03-01

## Core Tree
- src/app
  - (marketing)
  - (auth)
  - (dashboard)
  - api
- src/modules
  - auth
  - admin-boundaries
  - properties
  - notifications
  - rental-applications
  - property-threads
  - ai
  - events
- src/shared
  - ui
  - lib
  - config
  - form
- src/infrastructure
  - db
  - cache
  - observability
- src/scripts

## Key Files
- Architecture:
  - docs/architecture/modular-monolith.md
  - docs/architecture/path-migration-map.md
- DB config:
  - drizzle.config.ts
  - src/infrastructure/db/schema/index.ts
  - src/infrastructure/db/migrations/meta/_journal.json
- Property schema:
  - src/infrastructure/db/schema/property-core.ts
  - src/infrastructure/db/schema/core-enums.ts
- Property create/action:
  - src/app/(dashboard)/dashboard/properties/actions/property.ts
- Property search API:
  - src/app/api/properties/route.ts
- Taxonomy APIs:
  - src/app/api/taxonomy/categories/route.ts
  - src/app/api/taxonomy/subcategories/route.ts
  - src/app/api/taxonomy/attributes/route.ts

## NPM Commands
- npm run dev
- npm run build
- npm run db:generate
- npm run db:migrate
- npm run db:verify
- npm run db:studio
- npm run db:import:geo
- npm run db:backfill:core
