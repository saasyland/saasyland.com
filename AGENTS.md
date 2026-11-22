# AGENTS.md

SaaSy Land is the source of the saasyland.com website, customer workspace and admin console: one TanStack Start (React 19) application running as a Cloudflare Worker with D1 through Drizzle, KV and R2, Better Auth, Polar, Resend, use-intl and Fumadocs. Bun is the package manager and script runner; Vite+ (`vp`) runs the dev server, builds, Vitest, oxlint and oxfmt from `vite.config.ts`.

The coding standard is the Conventions section of the docs, [`content/docs/conventions/`](content/docs/conventions/index.en-US.mdx), published at <https://saasyland.com/docs/conventions>. Read the page for the kind of code you are about to write before you write it. This file is the summary.

## Commands

```sh
bun install --frozen-lockfile
bun run dev
bun run check
bun run test:coverage
bun run build:test
bun run test:e2e:pr
bunx playwright test e2e/specs/<spec>.spec.ts --project=chromium
bun scripts/enqueue-pr.ts <number>
```

Run tests with `bun run test`, never `bun test`. `bun run db:reset:test` recreates and seeds the local test database that the browser suite uses. Other worktrees run browser suites on this machine too, so run yours on a free port from 3020 to 3029, the range the test build trusts: `lsof -nP -iTCP:3027 -sTCP:LISTEN` prints nothing for a free port, then `PLAYWRIGHT_BASE_URL=http://127.0.0.1:3027 bun run test:e2e:pr`. Never stop or reuse a server you did not start; the run stops before the first test when the server on its port belongs to another worktree. Format and lint only the files you changed with `bunx vp fmt <files>` and `bunx vp lint --fix <files>`; never run `bun run check:fix` or `vp check --fix` over the repository. The formatter keeps `package.json` scripts sorted by name, and `vp check` fails when one is out of order.

## Definition of done

`bun run check`, `bun run test:coverage` and `bun run build:test`, in that order, exit 0 on the branch you are about to push, then so do the browser specs your change touches (`bunx playwright test e2e/specs/<spec>.spec.ts --project=chromium`, with `PLAYWRIGHT_BASE_URL` on a free port of 3020 to 3029), and the pull request carries its changelog entry (rule 10). CI runs the full browser suite on the pull request and again in the merge queue, and the pull request is done only when it is green there and `bun scripts/enqueue-pr.ts <number>` has put it in the queue; never merge by hand. `bun run test:e2e:pr` runs the full suite locally. A documentation-only change may skip the browser specs, not the build. Nothing else counts as done, including a summary that says it is.

## Where code goes

- `src/modules/<table>/`: one folder per database table, and only for real tables: `<table>.schema.ts`, `.constants.ts`, `.zod.ts`, `.types.ts` (one interface named after the module), `use-cases/<verb>-<noun>.ts` (a server function plus its query or mutation options). Tables end their columns with `...timestamps()` from `src/integrations/drizzle-orm/drizzle.columns.ts`, except the short-lived `rate_limit` counters and the insert-only `revoked_license_order`. Copy `src/modules/course`.
- `src/routes/`: route files that compose pages, with `NAMESPACE` or `NAMESPACES`, one `Promise.all` loader and a skeleton `pendingComponent`. Copy `src/routes/admin.courses.index.tsx`.
- `src/presentation/components/custom/`: a file per component, named after it, in flat area folders; it may also export the companions that only make sense beside it (a compound part, an area's skeletons, a field family). Components read their own translations and data; controls are shadcn primitives or React Aria components, not hand-written elements; corners take `rounded-lg` for surfaces, `rounded-md` for controls, `rounded-sm` for elements inside them and `rounded-full` for circles and pills, never another radius.
- `src/integrations/<vendor>/`: vendor configuration. `src/lib/`: utilities and server functions that own no table. `src/data/`: data several files share, and each area's paths, menu entries, dashboard statistics, page skeletons and permission statements in `<area>.routes.ts`, `<area>.navigation.ts`, `<area>.dashboard.ts`, `<area>.skeletons.ts` and `<area>.access.ts`, its namespaces in other areas' layouts in `<area>.namespaces.ts`, and its Worker handlers, root components, time zone, Vite plugins, deploy checks and live site checks in `<area>.worker.ts`, `<area>.root.ts`, `<area>.time-zone.ts`, `<area>.vite.ts`, `<area>.deploy.ts` and `<area>.live.ts`, and the purposes of the emails it sends in `<area>.email-purposes.ts`, joined by the `*.entries.ts` barrels, to which the core adds an empty list (`core.worker.ts`, `core.root.ts`) when only optional areas fill one; an area may define a list that other areas add to, such as course access (`<area>.course-access.ts`), the licence offer (`<area>.license-offer.ts`), the purchase confirmation's next steps (`<area>.purchase-email.ts`), the badges of the workspace's menu (`<area>.app-badges.ts`), the auth area's Better Auth plugins, emails, customer overview and admin user profile (`<area>.auth-plugins.ts`, `<area>.auth-emails.ts`, `<area>.app-overview.ts`, `<area>.user-profile.ts`), the columns of the payments area's customers table (`<area>.customer-columns.ts`), the title of the first paid lesson a licence opened (`<area>.opened-lesson.ts`) and the polar area's webhook events (`<area>.polar-events.ts`), and leaving the area out leaves out that list and its additions; the admin console and the customer workspace belong to the auth area; no file lists every area, and `src/server.ts`, `vite.config.ts`, `__root.tsx` and the deploy scripts name none.
- `messages/<locale>/<namespace>.json`, `content/docs/**/<page>.<locale>.mdx` and `content/changelog/<number>.<locale>.mdx`: every string, every docs page and every changelog entry in every locale; an area labels its menu entries in `navigation.<area>.json` and its dashboard statistics in `dashboard.<area>.json`.

## Rules without exceptions

1. No comments anywhere: code, tests, scripts, configuration, CSS. Only generated files (`src/routeTree.gen.ts`, `src/types/worker-configuration.d.ts`) are exempt.
2. No `oxlint-disable`, `eslint-disable`, `@ts-expect-error`, `@ts-ignore`, `@ts-nocheck`, `as` casts or `any` to get past a rule. Fix the cause.
3. No multi-line ternaries; conditional classes use `cn("base", { "classes": condition })` from `~/src/lib/cn`.
4. No `?? undefined`; validate with Zod instead. Outside tests and `src/platform/testing`, `null` is written only where an API defines it: in a comparison with a value that can be `null`, and in a React DOM ref (`useRef<HTMLElement>(null)`).
5. Statuses, kinds, tiers, roles, environment names, HTTP statuses and other domain values are named constants (`COURSE_STATUS.DRAFT`, `ENVIRONMENT.PRODUCTION`, `HTTP_STATUS.NOT_FOUND`), never repeated string literals, in tests, e2e data and the seed too; schema tests are the one place a stored value is written out. Lengths are named constants in the module's `.constants.ts` as well.
6. Server functions validate their input with the module's Zod schema, type it as `Module["operation"]` and run the middleware of `auth.middleware.ts` that fits: `authorized(...)` for a signed-in user or a permission, `withRequest` for a public read, `withRateLimit(...)` for an operation that sends email, changes credentials or redeems a token. Route guards are not authorization.
7. Forms follow the shadcn TanStack Form pattern; tables use the one `DataTable` with an `<entity>-columns.tsx` file.
8. Every user-facing string in every locale; numbers shown on the site are measured (`REPOSITORY_FACTS`) or declared once in `src/data` (`TIER_PRICES`), and the docs print values the code defines with `<RepositoryFact>` and `<RepositoryTable>`; nothing is typed.
9. Coverage stays at 100% for lines, statements, functions and branches; delete unreachable branches instead of stubbing them. Every user and admin flow is listed in `e2e/data/<area>.flows.ts` with the Playwright test that performs it end to end and asserts its outcome, or the reason no test does yet; `bun run check:flows` fails when a flow names a test that is gone.
10. A change updates the README, the docs in every locale and the site copy it affects, and its pull request adds its changelog entry: once the pull request has its number, write `content/changelog/<number>.<locale>.mdx` in every locale, a bulleted list without a date. The changelog dates each entry by the squash commit that brings it to `main`, and `bun run check` fails a pull request's CI run while its entry is missing.
11. Commits are conventional (`fix(auth): keep the locale in verification links`), never `--no-verify` or `-c core.hooksPath`, and carry no `Co-Authored-By` trailer or any other AI attribution; the same goes for pull request descriptions. Do not type the emoji: the hook adds it from the type, and `scripts/enqueue-pr.ts` adds it to the pull request title, which becomes the squash commit (`feat` ✨, `fix` 🐛, `docs` 📚, `refactor` 📦, `chore` ♻️, `test` 🚨, `perf` 🚀, `build` 🛠️, `ci` ⚙️, `style` 💎, `revert` 🗑️). History is linear: never create a merge commit, bring a branch up to date by rebasing it onto `main` (`gh pr update-branch --rebase`), and push a rewritten branch of your own with `git push --force-with-lease`, never `--force`.
12. Stay on the latest dependency versions: adapt the code, or carry an upstream bug as a `bun patch` and report it upstream. Never pin back.

## Human review required

Do not change these without a person's explicit go-ahead in the task:

- `src/integrations/drizzle-orm/migrations/`: applied to production databases and irreversible.
- `src/modules/license/license.webhooks.ts`, `src/modules/license/use-cases/`, `src/integrations/polar/` and `src/integrations/affonso/`: payments, licences and affiliate referrals.
- `src/integrations/better-auth/`: sessions, tokens and permissions.
- `src/data/access.ts`, `src/data/access.entries.ts` and each `src/data/<area>.access.ts`: permission statements and the grants of each role.
- `src/data/auth-plugins.ts`, `src/data/auth-emails.ts`, their `.entries.ts` barrels and each `src/data/<area>.auth-plugins.ts` and `<area>.auth-emails.ts`: the Better Auth plugins, among them the Polar plugin and its webhooks, and the auth emails.
- `src/data/course-access.ts`, `src/data/course-access.entries.ts` and each `src/data/<area>.course-access.ts`: who may open paid lessons.
- `src/data/polar-events.ts`, `src/data/polar-events.entries.ts` and each `src/data/<area>.polar-events.ts`: which code each Polar webhook event reaches, such as the licence grants and revocations and the copies of Polar's orders and subscriptions.
- `src/modules/license/license.api.ts` and `src/routes/api/cli.v1.*`: the CLI licence API, which activates, checks and releases licence keys.
- `wrangler.jsonc`, `.env*`, `.github/workflows/` and anything that reads a secret.

Never deploy, apply remote migrations or change secrets (`wrangler deploy`, `--remote`, `wrangler secret`); those are human steps.

## Current library documentation

The framework versions here are newer than most training data. Read the installed documentation before using an API:

- Vite+: `node_modules/vite-plus/docs`.
- TanStack Start, Router and Table ship agent skills inside their packages: `node_modules/@tanstack/react-start/skills`, `node_modules/@tanstack/react-router/skills`, `node_modules/@tanstack/react-table/skills`.
- Vendor skills for Better Auth, Cloudflare, Polar, Resend, TanStack and others are pinned in `skills-lock.json`; `bun run skills:sync` installs them into `.agents/skills` and links them into `.claude/skills`.
