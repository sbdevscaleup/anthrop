# Master Context (Anthrop)

Last updated: 2026-03-01

## Product Snapshot
Anthrop is a Next.js 16 + React 19 modular-monolith real estate platform with:
- Marketing pages
- Auth/onboarding
- Dashboard flows
- Property listing/search
- Admin boundary import
- Post-MVP modules: notifications, rental applications, property threads, AI assist

## Architecture Snapshot
- App routing/adapters only: src/app
- Domain modules: src/modules
- Shared cross-domain: src/shared
- Infra concerns: src/infrastructure
- Operational scripts: src/scripts

Primary architecture docs:
- docs/architecture/modular-monolith.md
- docs/architecture/path-migration-map.md

## Current Technical Baseline
- Framework: Next.js 16.1.1
- DB access: Drizzle ORM + PostgreSQL
- Auth: better-auth
- UI: shadcn/Radix under src/shared/ui
- DB migration tooling:
  - npm run db:generate
  - npm run db:migrate
  - npm run db:verify
  - npm run db:studio

## Canonical DB Paths
- client: src/infrastructure/db/client.ts
- schema index: src/infrastructure/db/schema/index.ts
- migrations: src/infrastructure/db/migrations/*
- drizzle config: drizzle.config.ts

## Current Migration State
Applied through:
- 0007_property_taxonomy_attributes

Journal:
- src/infrastructure/db/migrations/meta/_journal.json

## Property Domain Status (Important)
Dual-model transition is active:
1) Legacy compatibility model:
- property.property_type
- shared columns (area_m2, bedrooms, bathrooms, floors, year_built)
- features_json

2) New taxonomy + typed attributes:
- property_category
- property_subcategory
- property_attribute_definition
- property_subcategory_attribute
- property_attribute_option
- property_attribute_value
- property_rental_terms
- property.category_id
- property.subcategory_id

Rule:
- Keep legacy fields for backward compatibility during transition.
- Treat features_json as overflow-only metadata, not primary query model.

## API Surface Snapshot
- Auth routes: /api/auth/[...all]
- Property search: /api/properties
- Taxonomy:
  - /api/taxonomy/categories
  - /api/taxonomy/subcategories
  - /api/taxonomy/attributes
- Notifications:
  - /api/notifications
  - /api/notifications/preferences
- Rental applications:
  - /api/rental-applications
  - /api/rental-applications/:id/decision
- Property threads:
  - /api/property-threads
  - /api/property-threads/:threadId/messages
- AI:
  - /api/ai/assist
  - /api/ai/sessions/:id
- Admin boundaries import:
  - /api/admin/boundaries/import

## Active Risks / Watchlist
- docs/schema-reference.md appears stale on some paths (`schemas` vs `schema`) and role enum content.
- Need clear cutover criteria before removing legacy property fields.
- Ensure all new filters rely on indexed paths where possible.

## Working Agreements for New Chats
- Use canonical imports only:
  - @/infrastructure/db/*
  - @/shared/*
  - @/modules/*
- Keep app routes thin; business logic belongs in modules/services.
- Avoid introducing new enum-coupled property categories.
- Keep URL paths stable; route groups are organizational only.
