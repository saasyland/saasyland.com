# SaaSyLand / ReactProjects architecture audit

Date: 2026-09-24

## Remediation follow-up

The user subsequently authorized implementation in both repositories. The original findings below record the audit baseline, not the final working tree.

Implemented in both: atomic D1 throttling with fail-closed behavior; exact translation-key augmentation and ICU checks; typed runtime parsing at RPC boundaries; matching permission helper conventions; request-scoped fresh authorization; sanitized localized errors; server-only email catalogs; compatible Vite+/Vitest tooling. ReactProjects now has executable tests, coverage gates for the critical shared modules, CI, localized root error handling, locale-aware transactional-route prerender exclusions, browser-output verification, account-provider uniqueness, and a corrected preview auth hostname.

SaaSyLand additionally fixes license attribution, replay and event ordering, ban validation, localized session/chart formatting, and bounded server-side user/product/category lists with database totals and working pagination. Better Auth is aligned at 1.7.6. No lint/type rules or existing coverage thresholds were disabled or lowered.

See [shared conventions and migration notes](../engineering/shared-conventions.md). Remote migrations and deployment have not been performed. The documented product/editor/course roadmap remains outside this existing-functionality correction.

Final verification results are recorded after the baseline findings.

## Original audit conclusion

SaaSyLand follows the same core architecture as the current ReactProjects checkout: TanStack Start server functions, module-owned use cases and schemas, centralized Better Auth permissions, React Query, Drizzle, and locale-specific message catalogs. It is **not yet correct in every area**. The audit reproduced failures in concurrent rate limiting, license-event attribution, ban validation, and translation-key checking. Some visible strings also bypass localization.

Matching ReactProjects is not sufficient evidence of correctness. Its rate limiter has the same concurrency defect, its translation typing is not a stronger reference, and its test commands are empty. Preserve SaaSyLand's stronger testing, session freshness, error translation, and build checks.

The original audit was read-only. The remediation follow-up above supersedes that implementation status.

## Baseline and scope

- SaaSyLand: current working tree based on `e64afb7d8`, including the existing staged check/test fixes.
- ReactProjects: `/Users/svmm25/Dropbox/___BUSINESS/______RECT_PROJECTS_COM/_reactprojects_com`, clean checkout at `4b2f1d9` dated 2026-09-24. Its package identifies `reactprojects.com` as its homepage. Older ReactProjects checkouts were not used as the reference.
- Reviewed translations, permissions, session handling, server functions, use-case boundaries, validation, database access, billing webhooks, email delivery, routing, package alignment, build configuration, and CI/testing.
- ReactProjects currently implements a smaller lead-capture application. It has no equivalent production admin or licensing workflows against which to establish feature parity.
- Verification was local: source inspection, compiler/check commands, the existing test suite, and temporary diagnostic probes. No live Cloudflare/Polar/Resend requests, deployment, new production build, or browser end-to-end run was performed in this audit.

## Findings requiring correction

### 1. P1 — Concurrent requests bypass the sensitive-action rate limiter

**Location:** [rate-limit.ts](../../src/lib/rate-limit.ts), lines 16–27; [auth.middleware.ts](../../src/integrations/better-auth/auth.middleware.ts).

The limiter separately reads a KV counter and writes the increment. Concurrent calls can read the same counter and all succeed. Every storage failure also returns `true`. Sensitive authentication server functions use this limiter before calling `auth.api`.

**Reproduction:** A temporary test called the real `withinRateLimit` function 20 times concurrently, with a limit of 3 and a shared key, using the existing asynchronous KV test double. All **20** calls returned `true`. This demonstrates the read/modify/write race; it was not a production load test.

Cloudflare additionally documents a one-write-per-second limit for a single KV key and eventual consistency, making this storage model unsuitable for enforcing an atomic counter. Better Auth documents that its endpoint rate limiting does not cover direct server-side `auth.api` calls. Sources: [KV writes](https://developers.cloudflare.com/kv/api/write-key-value-pairs/), [KV consistency](https://developers.cloudflare.com/kv/concepts/how-kv-works/), [Better Auth rate limiting](https://better-auth.com/docs/concepts/rate-limit).

**Correction:** Enforce sensitive limits with atomic state, such as a Durable Object coordinating requests for a key. Specify the intended window and failure behavior explicitly. Authentication throttling must not silently allow all requests when its storage fails. Add concurrency and unavailable-storage tests alongside sequential boundary tests.

**Reference comparison:** ReactProjects also uses separate KV reads/writes and allows requests on exceptions. This is a shared defect, not a pattern to copy.

### 2. P1 — Unrelated billing events can revoke the current license

**Location:** [license.webhooks.ts](../../src/modules/license/license.webhooks.ts), lines 46–51 and 66–70; [revoke-license.ts](../../src/modules/license/use-cases/revoke-license.ts), lines 10–11.

Paid-order handling checks that the product maps to a license tier. Refund handling does not check the product or order identity. Benefit-revocation handling does not check whether the benefit is a license benefit. Both revoke by customer external ID alone, and the database update selects only by user ID.

**Reproduction:** Two temporary tests invoked the real webhook handlers while recording calls to the revocation function. A refund with an unrelated product ID invoked revocation. A revoked benefit with empty properties also invoked revocation. Both should leave an unrelated current license untouched.

Consequently, a refund for another purchase, or an older order after an upgrade, can revoke the user's current entitlement. The same applies to revoking a non-license benefit.

**Correction:** Identify the entitlement represented by each event and constrain the database update to the matching order/license identity. Validate recognized products and license-benefit properties. Cover unrelated purchases, previous orders, non-license benefits, duplicate delivery, and event ordering. Review grant/key attachment with the same identity model because the current grant operation upserts one license per user.

**Reference comparison:** ReactProjects has no equivalent licensing implementation.

### 3. P2 — The translation type augmentation does not constrain message keys

**Location:** [i18n.types.d.ts](../../src/integrations/use-intl/i18n.types.d.ts), lines 6–13; [check-i18n.ts](../../scripts/check-i18n.ts), lines 142–205.

The application augments `IntlMessages`, while the installed `use-intl` version obtains message types from `AppConfig.Messages`. Only `AppConfig.Locale` is configured. The generated English message types therefore do not constrain `useTranslations` calls.

The regex checker is useful supplementary validation, but skips root translators, variable/template keys, and bindings associated with multiple namespaces. Its success message, “Every literal message key resolves,” exceeds what it actually checks.

**Reproduction:** Both of the following invalid calls compiled successfully, and `bun scripts/check-i18n.ts` also exited successfully:

```tsx
const rootTranslator = useTranslations()
rootTranslator("audit.definitelyMissingMessage")

const commonTranslator = useTranslations("common")
const key = "auditDefinitelyMissingMessage"
commonTranslator(key)
```

**Correction:** Add `Messages: AppMessages` to the `AppConfig` augmentation in module `use-intl`, using the generated English catalog. Resolve the compiler errors this exposes with correctly typed keys and namespace helpers. Keep catalog-parity, ICU-argument, rich-text-tag, and content checks. Do not replace compiler errors with casts or broad string types.

The installed `use-intl/dist/types/core/AppConfig.d.ts` is the direct evidence for this extension point; the related [official TypeScript documentation](https://next-intl.dev/docs/workflows/typescript) explains the `AppConfig.Messages` model. This does not require adopting Next.js.

**Reference comparison:** No stronger message-key augmentation was found in ReactProjects. Its use of the same translation library alone does not solve this problem.

### 4. P2 — Runtime validation is incomplete at several server boundaries

**Location:** [user.zod.ts](../../src/modules/user/user.zod.ts), lines 20–24; the validators in [get-user.ts](../../src/modules/user/use-cases/get-user.ts), [get-category.ts](../../src/modules/category/use-cases/get-category.ts), [get-product.ts](../../src/modules/product/use-cases/get-product.ts), [fumadocs.docs.tsx](../../src/integrations/fumadocs/fumadocs.docs.tsx), and [fumadocs.blog.tsx](../../src/integrations/fumadocs/fumadocs.blog.tsx).

`banExpiresIn` accepts any number. A temporary probe confirmed that `-60` passes the schema. The installed Better Auth handler also accepts a number and computes the expiry from that value, so it can store a ban expiration in the past. The reason has no length bound.

Five server-function validators return their input unchanged. A TypeScript `string` annotation does not validate incoming RPC data. The user/category/product endpoints still enforce permissions; this is a validation gap, not evidence of an authorization bypass or SQL injection.

**Correction:** Require a positive integer duration when provided, bound and trim the reason, and use module-owned runtime schemas for IDs and content slugs. Select constraints appropriate to existing data. Test malformed requests at the server-function boundary, including negative/fractional durations.

**Reference comparison:** ReactProjects already specifies a positive integer ban duration and a trimmed, bounded reason. Its use cases parse their input with module schemas. These are appropriate patterns to align.

### 5. P2 — Some user-visible strings and formats bypass translation catalogs

**Location:** [admin-active-session-row-client.tsx](../../src/presentation/components/custom/admin/components/admin-active-session-row-client.tsx), lines 16–34, 57, and 88; [analytics-revenue-chart.tsx](../../src/presentation/components/custom/admin/analytics/components/analytics-revenue-chart.tsx), lines 12–33.

Session details generate English `just now`, `min`, `h`, `d`, and `Unknown device` independently of the current locale. The English duration is inserted into an otherwise translated sentence. The analytics chart embeds `May 1: $2,400`, `Today: $4,200`, and dollar axis labels directly in presentation data.

**Correction:** Store semantic values in chart data and format dates, relative times, and currency through the locale formatter. Put fallback device labels and surrounding copy in all nine catalogs. Avoid inserting an already formatted relative-time phrase into another “ago” phrase. Verify at least one non-English rendering and plural boundaries.

**Reference comparison:** Both projects use the appropriate translation/formatter architecture. These are incomplete uses of that architecture in SaaSyLand's additional UI.

## Dependency alignment

SaaSyLand has Better Auth **1.7.5** installed; the reference uses **1.7.6**. The official September 24 patch includes fixes for overlong-password handling and auth-query hydration/stale-response behavior. Updating that patch is warranted, followed by auth validation and sign-in/session tests. This audit does not characterize the version difference as a known CVE. Source: [Better Auth v1.7.6 release](https://github.com/better-auth/better-auth/releases/tag/v1.7.6).

The checked core versions already match for React 19.3.0, TanStack Start 1.168.58, Vite+ 1.0.0-rc.0, and Wrangler 4.138.0. This was a comparison of the repositories and relevant release notes, not a claim that every package is the newest release on the registry.

Do **not** copy the reference's Vite/Vitest overrides: it retains Vite+ core 0.3.3 and Vitest 4.1.11 overrides despite declaring Vite+ 1.0.0-rc.0. SaaSyLand's matching core and Vitest 5.0.1 setup should remain. Its Base UI-backed Fumadocs package is also an intentional UI integration, not evidence of an outdated dependency merely because the reference uses a different package.

## Pattern comparison and decisions

| Area                     | Audit assessment                                                                                                                                                                                                     | Decision                                                                                             |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Module organization      | Both keep constants, schemas, types, and use cases under feature modules.                                                                                                                                            | Keep this organization.                                                                              |
| Server functions         | Both use Start server functions, middleware, schema parsing, and server-side operations. SaaSyLand has the validation exceptions above.                                                                              | Correct the exceptions; retain the architecture.                                                     |
| Permissions              | Centralized access-control statements and roles; inspected private user/product/category/session operations check permissions inside server functions. Own-account operations use the authenticated user's identity. | Keep enforcement on the server; UI visibility is supplementary.                                      |
| Helper conventions       | Reference uses `hasPermission({ role, permission })`; SaaSyLand uses positional arguments. Middleware context names and query-key shapes also differ.                                                                | Convention drift, not an established bug. Align deliberately if a single shared template is desired. |
| Session freshness        | SaaSyLand shares a session promise per request and disables the cookie cache for its server authorization lookup.                                                                                                    | Retain; avoid cross-request session caching.                                                         |
| Translation loading      | Both preload route namespaces and build locale message trees across nine locales.                                                                                                                                    | Keep selective namespace loading; fix key typing and untranslated UI.                                |
| Browser/email separation | SaaSyLand excludes email namespaces from browser catalogs and loads them separately on the server.                                                                                                                   | Preserve this separation and its checks.                                                             |
| Error handling           | SaaSyLand maps application/auth errors to translation keys and sanitizes unknown failures.                                                                                                                           | Keep; copying inline English reference errors would regress localization.                            |
| Database                 | Module-owned Drizzle schemas and server-side access; parameterized queries and account-provider uniqueness are present.                                                                                              | No broad rewrite indicated by this audit.                                                            |
| Email                    | Critical auth email delivery is awaited; reference lead emails can use background work.                                                                                                                              | Preserve the delivery guarantees appropriate to the workflow.                                        |
| Routing/build            | Locale handling, protected-route exclusions from prerendering, client/server boundary checks, and output verification are present.                                                                                   | Preserve; review build output when implementing fixes.                                               |
| Tests/CI                 | SaaSyLand runs checks, coverage gates, and configured browser CI workflows. Reference test scripts are empty.                                                                                                        | SaaSyLand is the stronger reference here.                                                            |

## Explicitly unfinished or scaling-sensitive areas

- Product/category admin data wiring is explicitly unfinished in the [roadmap](../../content/docs/project/roadmap.en-US.mdx). For example, the product creation page's Save/Cancel controls are not connected to the create mutation/navigation flow. Course admin is explicitly described as a shell with planned module wiring in the [course documentation](../../content/docs/features/courses.en-US.mdx). Several other admin views use demo data. These should not be represented as complete production workflows.
- User/product/category list use cases retrieve the entire collection. This is a scaling concern once data grows; use bounded server pagination/filtering before that becomes material. ReactProjects contains a bounded user-list input schema, but does not implement an equivalent full admin listing workflow, so this is not a claim of proven implementation parity there.

## Verification and reproducibility

Final `bun run check` passed: all 2,589 files formatted, no warnings/lint/type errors in 761 checked files, and all translation/content checks passed. An independent `bun x tsc --noEmit` also passed.

The existing coverage suite passed: **218 files, 1,121 tests**. Reported coverage was 100% for statements (4,030), branches (1,264), functions (1,254), and lines (3,887). This proves the existing suite passes; it does not prove the invariants missing from that suite.

Temporary diagnostic tests exercised the real limiter, ban schema, and webhook handlers with the project's test infrastructure. They produced four expected audit failures:

| Probe                                 | Expected invariant    | Observed result     |
| ------------------------------------- | --------------------- | ------------------- |
| 20 concurrent calls, limit 3          | At most 3 accepted    | 20 accepted         |
| Ban duration `-60`                    | Validation rejects    | Validation succeeds |
| Unrelated product refund              | No license revocation | Revocation invoked  |
| Revoked benefit without a license key | No license revocation | Revocation invoked  |

The separate missing-message probe passed both TypeScript and `check-i18n.ts`, demonstrating the checking gap described above. Probe files were removed from the application tree after recording their results. No customer data or external services were changed.

Implementation priority: atomic auth throttling and identity-scoped license events first; then translation typing, runtime validation, locale presentation, and the Better Auth patch. Add regression tests for the demonstrated failures as part of those corrections, without weakening the current rules or using type casts to suppress errors.

## Final remediation verification

- SaaSyLand: `bun run check` passes without lint, type, or formatting errors. Translation/content validation passes across nine locales.
- SaaSyLand: `bun run test:coverage` passes **222 files / 1,176 tests**, with **100% statements, branches, functions, and lines**. Existing thresholds are unchanged.
- SaaSyLand: the isolated local D1 migrations and seed pass; `bun run build:test` verifies **1,162 prerendered pages**. Chromium runs for smoke, locales, authorization routing, and authenticated workspaces pass **30 tests**.
- ReactProjects: the reviewed changes are applied to the original checkout. `bun run check` and `bun run test:coverage` are verified there after frozen-lockfile installation and type/content generation.
- ReactProjects: **9 files / 49 tests** pass. The rate limiter, request middleware, request session lookup, auth-error mapping, and server email registry have **100% gated coverage**. Whole-application coverage is **15.96% statements / 10.88% branches / 9.49% functions / 15.83% lines**; this is an initial test foundation, not the same overall coverage as SaaSyLand.
- ReactProjects: `bun run build:preview` verifies **216 prerendered pages**, and **9 Chromium smoke tests** verify landing-page hydration across every supported locale. CI now runs checks, tests, coverage, the build, and these browser tests.
- New regression cases cover concurrent admission, storage failure, provider-account uniqueness, permission denial, input validation, exact translation keys, license-event identity/replay/order, database pagination/sorting/filtering, and locale-aware session text.

Build/browser verification for ReactProjects used the temporary checkout with the same reviewed source and lockfile that were copied to the original checkout. Production provider calls, remote migrations, remote CI execution, and deployment were not performed. Browser checks cover the flows named above, not every route/action or payment-provider workflow.
