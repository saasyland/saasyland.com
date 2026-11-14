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
- `mocks/resend.ts` and `mocks/polar.ts` — strict doubles of the Resend and Polar APIs; `mocks/providers.ts` routes `fetch` to them
- `lib/` — small shared helpers imported from many suites (URL/cookie helpers, nullable DB fixtures, component test utilities, Polar models and signed webhooks)

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

## Server and client sides

TanStack Start picks the side from the environment: a server function runs where `window` is absent and is a client stub where it exists. The Vitest projects follow the same line.

| Under test                                         | Project               | How                                                                                                |
| -------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------- |
| Server functions, use cases, route loaders, `head` | `node`, `integration` | Call the use case, or load the path through `getRouter()` and assert `router.state.matches`        |
| Pages and components                               | `component`           | Give the route its loader data, or mock the `queryFn` / `mutationFn` of the options the page reads |

`lib/server-function.ts` stands in for the Start compiler. On the server side it runs the function inside a Start request context; in the `component` project a server function rejects with a message saying so, because jsdom is the browser and the browser never executes server code. `src/routes/__test__/marketing-loaders.test.ts` and `marketing-routes.component.test.tsx` show the two halves of one route side by side.

## Ownership

Routes in `src/routes/` compose pages and preload queries. Widgets, dialogs, forms, and table columns live one per file in `src/presentation/components/custom/` (shared components at the top level, area and page folders such as `admin/users/` below it); their tests live in the nearest `__test__/` folder or in `src/routes/__test__/` when they exercise a whole route. Data shared by several files lives in `src/data/`; executable utilities live in `src/lib/`.

Use cases live in `src/modules/{table}/use-cases/`. They validate inputs and enforce their own authorization through native TanStack Start middleware. Vendor setup and adapters live in `src/integrations/{vendor}/`. Presentation components consume query/mutation options and never import database or provider clients directly.

## Provider doubles

`setup.ts` replaces `fetch` with `fetchFromProviders` before every test, so the app's own Resend and Polar SDK clients reach the doubles exactly as they reach the real APIs in production. Each double checks the request the way the provider would and answers like it:

- `mocks/resend.ts` serves `POST /emails`. It requires the `RESEND_API_KEY` bearer token, validates the body with a strict Zod schema whose fields are typed against the SDK's `EmailApiOptions`, and replays a repeated `Idempotency-Key` instead of delivering twice. `getSentEmails()` returns the delivered emails, rendered HTML included.
- `mocks/polar.ts` serves the five endpoints the app calls: create a checkout, list discounts, get a licence key, deactivate an activation and get an order. It requires `POLAR_ACCESS_TOKEN`, validates bodies and queries with strict schemas typed against the SDK's `models`, refuses products and discounts the organization does not have, and answers with complete `models.Checkout`, `models.Order` and `models.LicenseKeyWithActivations` objects. The catalogue is the app's own: the product IDs from `POLAR_PRODUCT_IDS`, the prices from `TIER_PRICES` in the currency's minor units (`toMinorUnits`), the licence-key activation limits from `LICENSE_ACTIVATION_LIMITS` and one automatic discount for each value of `PPP_PERCENTS_OFF`. Tests drive the purchase with `payPolarCheckout`, `grantPolarLicenseKey`, `refundPolarOrder`, `revokePolarLicenseKey` and `activatePolarLicenseKey`.

A request the provider would refuse or an endpoint the app does not use is answered as the provider would answer it and recorded; the shared `afterEach` fails the test if anything was recorded, even when the app swallowed the error. Any other host fails as if the machine were offline. `lib/polar.ts` builds the Polar models and signs webhooks with the Standard Webhooks scheme, for the integration suites and for `e2e/fixtures/polar.ts`.

## Auth integration harness

The Better Auth suites run against the real `auth` from `src/integrations/better-auth/auth.server.ts`, with the in-memory D1 and the provider doubles as its only boundaries. `src/integrations/better-auth/__test__/fixtures/auth.harness.ts` signs up, verifies and signs in through `auth.api` with the headers a browser sends, and reads tokens from the emails the Resend double delivered.

Session fixtures for use-case tests: `__test__/fixtures/auth.session.fixture.ts`.

`src/modules/license/__test__/license-purchase.integration.test.ts` runs the whole purchase on the server: `startCheckout` against the Polar double, then signed `order.paid`, `benefit_grant.created`, `order.refunded` and `benefit_grant.revoked` webhooks through Better Auth's Polar endpoint, in order, out of order, twice and with bad signatures, and the activation listing and deactivation.

Better Auth hands email delivery to `waitUntil`, so suites await `flushWaitUntil()` from `mocks/cloudflare.ts` before reading `getSentEmails()`.

Browser tests use `worker.ts`, which installs the same provider doubles for Resend and Polar in the test Worker and gives the Polar double the licence key of the seeded `TEST_LICENSE` with its activation. The test Worker exposes captured email payloads at `/__test/emails?to=...`, allowing Playwright to follow the actual verification link. This endpoint and provider interception belong only to the test entry; deployed builds use `src/server.ts`.

## Vite+ and the browser test app

`vp test` runs the Node, integration, and jsdom projects from the `test` block of `vite.config.ts`. It uses only the React transform; it does not start a Worker or contact remote bindings.

Playwright runs the built application through `vp preview`. At build time, the standard `CLOUDFLARE_ENV=test` setting selects `env.test` in the root `wrangler.jsonc`: the test Worker entry point, local D1/KV bindings, and secrets from `.env.test`. Cloudflare carries that configuration and those local secrets into the preview build automatically. Preview uses `--mode test` to select isolated local storage; it does not reselect the already-built Cloudflare environment. No custom `E2E` flag, dotenv parser, or shell sourcing is needed.

Local D1 migrations, seeding, and the preview server all use `.wrangler/test`; `db:reset:test` deletes it, then migrates and seeds it again. Remote bindings are enabled only for `CLOUDFLARE_ENV=development`.

```sh
bun run db:reset:test
bun run build:test
bun run start:test
```

Reference: [Vite+ testing](https://viteplus.dev/guide/test), [Cloudflare local environment variables](https://developers.cloudflare.com/workers/local-development/environment-variables/).
