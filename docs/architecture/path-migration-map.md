# Path Migration Map

## Canonical Mappings

- `src/components/ui/*` -> `src/shared/ui/*`
- `src/lib/utils.ts` -> `src/shared/lib/utils.ts`
- `src/components/form/*` -> `src/shared/form/*`
- `src/components/theme-*` + `src/components/theme-provider.tsx` -> `src/shared/ui/theme/*`
- `src/components/auth/*` -> `src/modules/auth/ui/*`
- `src/components/landing/map-demo.tsx` -> `src/modules/properties/ui/map-demo.tsx`
- `src/lib/auth/*` -> `src/modules/auth/{application|infrastructure|ui|domain}/*`
- `src/lib/geo/*` -> `src/modules/admin-boundaries/infrastructure/*`
- `src/lib/emails/*` -> `src/modules/auth/infrastructure/emails/*`
- `src/drizzle/db.ts` -> `src/infrastructure/db/client.ts`
- `src/drizzle/schema.ts` -> `src/infrastructure/db/schema/index.ts`
- `src/drizzle/schemas/*` -> `src/infrastructure/db/schema/*`
- `src/drizzle/migrations/*` -> `src/infrastructure/db/migrations/*`

## Contributor Notes

- Use `@/infrastructure/db/*` for all DB imports.
- Use `@/shared/*` for reusable primitives.
- Keep new feature logic under `src/modules/<feature>`.
- Keep `src/app/api` route files thin: parse input, call service, return response.