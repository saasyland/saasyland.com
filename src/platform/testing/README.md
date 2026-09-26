# Testing

All **suites** live next to the code under `src/**/__test__/`. This folder is Vite+ **test runtime wiring** that cannot belong to one feature (setup, global module aliases, cross-cutting request URL helpers).

## Where to look

| Kind        | Location                                | Vitest project | Marker                 |
| ----------- | --------------------------------------- | -------------- | ---------------------- |
| Unit        | `src/**/__test__/*.test.ts`             | `node`         | `.test.ts`             |
| Component   | `src/**/__test__/*.component.test.tsx`  | `component`    | `.component.test.tsx`  |
| Integration | `src/**/__test__/*.integration.test.ts` | `integration`  | `.integration.test.ts` |
| E2E         | `e2e/specs/**/*.spec.ts`                | Playwright     | `.spec.ts`             |

**Rule:** open the module → open `__test__/`. Owner-specific helpers and fixtures live there too (e.g. auth harness beside auth, i18n fixtures beside use-intl).

### Entity schema tests (Drizzle + Zod)

Colocate tests with the module they cover. Name files after the **source file**, not a generic `schemas.test.ts`:

| Source file          | Drizzle / table tests     | Zod (drizzle-zod) tests |
| -------------------- | ------------------------- | ----------------------- |
| `{entity}.schema.ts` | `{entity}.schema.test.ts` | —                       |
| `{entity}.zod.ts`    | —                         | `{entity}.zod.test.ts`  |

Examples: `verification.zod.test.ts`, `user.schema.test.ts`. Cross-table and D1 integration checks live in `src/integrations/drizzle-orm/__test__/`.

Form / API validation schemas keep their own names (e.g. `auth.zod.test.ts` beside `auth.zod.ts`).

### What belongs in `platform/testing/`

- `vitest-env.d.ts` — Vitest globals and jest-dom matcher types for Vitest 5
- `setup.ts` — registers jest-dom matchers and shared test hooks; loaded by `test.setupFiles` in root `vite.config.ts`
- `.env.test` supplies the dummy test credentials. Vite+ loads them through `test.env`; Cloudflare loads them for its named `test` environment.
- `mocks/cloudflare.ts` and `mocks/wrksz-themes.ts` — local binding and theme adapters used across suites
- `lib/` — small shared helpers imported from many suites (URL/cookie helpers, nullable DB fixtures, component test utilities)

Everything else is colocated with its owner.

## Commands

```bash
bun run test
bun run test:watch
bun run test:unit
bun run test:component
bun run test:integration
bun run test:coverage
bun run test:e2e:smoke
```

Use `bun run test`, not `bun test`: Vitest owns the projects, environments and setup files. `bun run test:coverage` enforces 100% statements, branches, functions, and lines. Cover real behaviour with tests and delete branches that can never run instead of stubbing globals to reach them. Pending states hold the mocked request open with `Promise.withResolvers()`, assert the pending UI, then resolve inside `act` and assert the idle UI.

## Ownership

Routes in `src/routes/` compose pages and preload queries. Widgets, dialogs, forms, and table columns live one per file in `src/presentation/components/custom/` (shared components at the top level, area and page folders such as `admin/users/` below it); their tests live in the nearest `__test__/` folder or in `src/routes/__test__/` when they exercise a whole route. Data shared by several files lives in `src/data/`; executable utilities live in `src/lib/`.

Use cases live in `src/modules/{table}/use-cases/`. They validate inputs and enforce their own authorization through native TanStack Start middleware. Vendor setup and adapters live in `src/integrations/{vendor}/`. Presentation components consume query/mutation options and never import database or provider clients directly.

## Auth integration harness

`src/integrations/better-auth/__test__/fixtures/auth.test-instance.ts` wraps Better Auth’s `getTestInstance` (Vitest-only). Do not import `better-auth/test` outside Vitest—it registers `afterAll` hooks at module load.

Session fixtures for use-case tests: `__test__/fixtures/auth.session.fixture.ts`.

`auth.signup.integration.test.ts` exercises the production signup server function, Better Auth configuration, database adapter, email templates, and Resend SDK. Better Auth hands verification delivery to `waitUntil`, so the test awaits `flushWaitUntil()` from `mocks/cloudflare.ts` and then checks the captured outbound HTTP requests for fresh and repeated signups.

Browser tests use `worker.ts` and `mocks/providers.ts` with isolated local bindings. The test Worker exposes captured email payloads at `/__test/emails?to=...`, allowing Playwright to follow the actual verification link. This endpoint and provider interception belong only to the test entry; deployed builds use `src/server.ts`.

## Vite+ and the browser test app

`vp test` runs the Node, integration, and jsdom projects from the `test` block of `vite.config.ts`. It uses only the React transform; it does not start a Worker or contact remote bindings.

Playwright runs the built application through `vp preview`. At build time, the standard `CLOUDFLARE_ENV=test` setting selects `env.test` in the root `wrangler.jsonc`: the test Worker entry point, local D1/KV bindings, and secrets from `.env.test`. Cloudflare carries that configuration and those local secrets into the preview build automatically. Preview uses `--mode test` to select isolated local storage; it does not reselect the already-built Cloudflare environment. No custom `E2E` flag, dotenv parser, or shell sourcing is needed.

Local D1 migrations, seeding, and the preview server all use `.wrangler/test`. Remote bindings are enabled only for `CLOUDFLARE_ENV=development`.

```sh
bun run db:migrate:test
bun run db:seed:test
bun run build:test
bun run start:test
```

Reference: [Vite+ testing](https://viteplus.dev/guide/test), [Cloudflare local environment variables](https://developers.cloudflare.com/workers/local-development/environment-variables/).
