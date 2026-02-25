# Modular Monolith Architecture

This codebase is organized as a modular monolith with clear boundaries:

- `src/app`: Next.js routing, layouts, and API route adapters only.
- `src/modules`: domain-oriented modules (auth, properties, organizations, admin-boundaries, notifications, rental-applications, property-threads, ai, events).
- `src/shared`: reusable cross-domain code (`ui`, `lib`, `config`, `types`, `form`).
- `src/infrastructure`: platform concerns (`db`, `cache`, `observability`).
- `src/scripts`: operational scripts.

## Boundary Rules

- App routes should delegate business logic to module application services.
- Shared code must stay domain-agnostic.
- Module internals should not be imported directly by other modules unless through explicit contracts.
- Infrastructure dependencies (DB, cache, observability) should be consumed through module infrastructure/application layers, not ad-hoc in UI components.

## Database Canonical Paths

- Drizzle client: `src/infrastructure/db/client.ts`
- Drizzle schema index: `src/infrastructure/db/schema/index.ts`
- Migrations: `src/infrastructure/db/migrations/*`
- Drizzle config points to the canonical DB paths.

## App Route Groups (URL-preserving)

- `src/app/(marketing)`
- `src/app/(auth)`
- `src/app/(dashboard)`
- `src/app/api`

Route groups are organizational only and do not change public URL paths.