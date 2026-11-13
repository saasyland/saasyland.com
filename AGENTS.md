# AGENTS.md

SaaSy Land is the source of the saasyland.com website, customer workspace and admin console: one TanStack Start (React 19) application running as a Cloudflare Worker with D1 through Drizzle, KV and R2, Better Auth, Polar, Resend, use-intl in nine locales and Fumadocs. Bun is the package manager and script runner; Vite+ (`vp`) runs the dev server, builds, Vitest, oxlint and oxfmt from `vite.config.ts`.

The coding standard is the Conventions section of the docs, [`content/docs/conventions/`](content/docs/conventions/index.en-US.mdx), published at <https://saasyland.com/docs/conventions>. Read the page for the kind of code you are about to write before you write it. This file is the summary.

## Commands

```sh
bun install --frozen-lockfile
bun run dev
bun run check
bun run test:coverage
bun run build:test
bun run test:e2e:pr
```

Run tests with `bun run test`, never `bun test`. `bun run db:reset:test` recreates and seeds the local test database that the browser suite uses. Format and lint only the files you changed with `bunx vp fmt <files>` and `bunx vp lint --fix <files>`; never run `bun run check:fix` or `vp check --fix` over the repository. The formatter keeps `package.json` scripts sorted by name, and `vp check` fails when one is out of order.

## Definition of done

`bun run check`, `bun run test:coverage`, `bun run build:test` and `bun run test:e2e:pr`, in that order, all exit 0 on the branch you are about to push. A documentation-only change may skip the browser suite, not the build. Nothing else counts as done, including a summary that says it is.

## Where code goes

- `src/modules/<table>/`: one folder per database table, and only for real tables: `<table>.schema.ts`, `.constants.ts`, `.zod.ts`, `.types.ts` (one interface named after the module), `use-cases/<verb>-<noun>.ts` (a server function plus its query or mutation options). Tables end their columns with `...timestamps()` from `src/integrations/drizzle-orm/drizzle.columns.ts`. Copy `src/modules/course`.
- `src/routes/`: route files that compose pages, with `NAMESPACE` or `NAMESPACES`, one `Promise.all` loader and a skeleton `pendingComponent`. Copy `src/routes/admin.courses.index.tsx`.
- `src/presentation/components/custom/`: one component per file in flat area folders; components read their own translations and data.
- `src/integrations/<vendor>/`: vendor configuration. `src/lib/`: utilities and server functions that own no table. `src/data/`: data several files share.
- `messages/<locale>/<namespace>.json` and `content/docs/**/<page>.<locale>.mdx`: every string and every docs page in all nine locales.

## Rules without exceptions

1. No comments anywhere: code, tests, scripts, configuration, CSS.
2. No `oxlint-disable`, `eslint-disable`, `@ts-expect-error`, `@ts-ignore`, `as` casts or `any` to get past a rule. Fix the cause.
3. No multi-line ternaries; conditional classes use `cn("base", { "classes": condition })` from `~/src/lib/cn`.
4. No `?? undefined` and no `null` literals; validate with Zod instead.
5. Statuses, kinds, tiers, roles and other domain values are named constants (`COURSE_STATUS.DRAFT`), never repeated string literals, in tests, e2e data and the seed too. Lengths are named constants as well.
6. Server functions validate their input with the module's Zod schema, type it as `Module["operation"]` and authorize themselves with `authorized(...)`; route guards are not authorization.
7. Forms follow the shadcn TanStack Form pattern; tables use the one `DataTable` with an `<entity>-columns.tsx` file.
8. Every user-facing string in all nine locales; numbers shown on the site are measured (`REPOSITORY_FACTS`), never typed.
9. Coverage stays at 100% for lines, statements, functions and branches; delete unreachable branches instead of stubbing them.
10. A change updates the README, the docs in all nine locales, the changelog and the site copy it affects.
11. Commits are conventional (`fix(auth): keep the locale in verification links`), never `--no-verify`, and carry no `Co-Authored-By` trailer or any other AI attribution; the same goes for pull request descriptions. Do not type the emoji: the hook adds it from the type (`feat` ✨, `fix` 🐛, `docs` 📚, `refactor` 📦, `chore` ♻️, `test` 🚨, `perf` 🚀, `build` 🛠️, `ci` ⚙️, `style` 💎, `revert` 🗑️).
12. Stay on the latest dependency versions: adapt the code, or carry an upstream bug as a `bun patch` and report it upstream. Never pin back.

## Human review required

Do not change these without a person's explicit go-ahead in the task:

- `src/integrations/drizzle-orm/migrations/`: applied to production databases and irreversible.
- `src/modules/license/license.webhooks.ts`, `src/modules/license/use-cases/`, `src/integrations/polar/` and `src/integrations/affonso/`: payments, licences and affiliate referrals.
- `src/integrations/better-auth/`: sessions, tokens and permissions.
- `wrangler.jsonc`, `.env*`, `.github/workflows/` and anything that reads a secret.

Never deploy, apply remote migrations or change secrets (`wrangler deploy`, `--remote`, `wrangler secret`); those are human steps.

## Current library documentation

The framework versions here are newer than most training data. Read the installed documentation before using an API:

- Vite+: `node_modules/vite-plus/docs`.
- TanStack Start, Router and Table ship agent skills inside their packages: `node_modules/@tanstack/react-start/skills`, `node_modules/@tanstack/react-router/skills`, `node_modules/@tanstack/react-table/skills`.
- Vendor skills for Better Auth, Cloudflare, Polar, Resend, TanStack and others are pinned in `skills-lock.json`; `bun run skills:sync` installs them into `.agents/skills` and links them into `.claude/skills`.
