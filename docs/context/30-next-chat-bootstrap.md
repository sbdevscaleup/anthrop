# New Chat Bootstrap Prompt

Use this at the start of any new conversation:

Project: Anthrop (Next.js 16 modular-monolith).
Please use these as source of truth:
1) docs/context/00-master-context.md
2) docs/context/10-repo-map.md
3) docs/context/20-property-taxonomy-transition.md
4) docs/architecture/modular-monolith.md
5) docs/architecture/path-migration-map.md
6) drizzle.config.ts
7) src/infrastructure/db/schema/property-core.ts
8) src/app/api/properties/route.ts
9) src/app/(dashboard)/dashboard/properties/actions/property.ts

Constraints:
- Keep public URL paths unchanged.
- Keep app routes thin; move logic to module services.
- Use canonical imports under @/infrastructure, @/modules, @/shared.
- Preserve dual-write/dual-read compatibility for property taxonomy migration.
- Treat features_json as overflow-only metadata.
- Prefer additive, backward-compatible DB changes.
- Validate with: npm run build, npm run db:migrate, npm run db:verify.
