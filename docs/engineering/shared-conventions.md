# Shared application conventions

Reviewed in SaaSyLand and ReactProjects on 2026-09-24.

These repositories share implementation conventions; their product features remain different. ReactProjects is a lead-capture site, while SaaSyLand also provides authenticated workspaces and licensing.

- Keep business operations in feature modules, with schemas, constants, permissions, and use cases owned by that module.
- Let TanStack Router own route loading and error boundaries through `defaultPendingComponent` and `defaultErrorComponent`. Reset Query errors in the error UI and retry through `router.invalidate()`. `setupRouterSsrQueryIntegration` supplies the Query provider. Use local Suspense for independently deferred content.
- Validate RPC input at runtime. Use a typed parsing callback (`(input: zod.input<typeof schema>) => schema.parse(input)`) so Zod failures reach the shared localized error boundary. The installed Start adapter turns Standard Schema failures into generic errors when a schema object is passed directly.
- Enforce permissions inside server functions using `authorized(permission)` and `hasPermission({ role, permission })`. Pass the request's headers and authenticated session through middleware. Share a fresh session promise only within one request; bypass the auth cookie cache for authorization.
- Keep expected errors as application/auth codes, translate them in the browser, and sanitize unknown failures. The root error boundary must work without an asynchronous translation provider.
- Generate the exact message-key shape and register it as `use-intl`'s `AppConfig.Messages`. Translated leaf values are strings; keys remain exact. Check key parity, ICU arguments, and rich-text tags across all nine locales. Keep email catalogs in a separate server-only registry.
- Store semantic dates and amounts; format them with the current locale. Do not construct English relative-time fragments in shared UI.
- Enforce rate limits through a conditional D1 upsert in a transactional batch. Never make admission depend on a separate KV read. Deny requests if rate-limit storage is unavailable.
- Bound collection queries and validate pagination/sort/filter inputs. Compute totals and filtering in the database; keep page parameters in query keys and use manual table pagination/sorting for server-owned lists.
- Attribute billing changes to the provider order. Preserve revocations across replay and out-of-order delivery, compare purchase dates before replacing a license, and scope key attachment to the active matching order.
- Keep Vite+/Vite/Vitest versions compatible. Run formatting, lint, types, translation checks, real tests, coverage gates, builds, and browser smoke checks in CI. Coverage gates describe measured code, not untested product behavior.

## Rollout

Run new D1 migrations before deploying the corresponding application version. Local validation does not apply migrations to development, preview, or production.

SaaSyLand adds `rate_limit`, `license.purchase_created_at`, and `revoked_license_order`. Existing licenses use a zero timestamp until their purchase date is retrieved from Polar when a paid-order event needs comparison. Provider failures reject the event for retry rather than guessing event order.

ReactProjects adds `rate_limit` and a unique `(provider_id, account_id)` index. Before applying the uniqueness migration to existing data, inspect duplicates with:

```sql
SELECT provider_id, account_id, COUNT(*) AS copies
FROM account
GROUP BY provider_id, account_id
HAVING COUNT(*) > 1;
```

Do not delete or reassign conflicting accounts automatically. The migration intentionally fails if ownership is ambiguous.

## Product scope

SaaSyLand's documented course/editor and demo-admin roadmap features remain planned work. This alignment fixes existing shared infrastructure and workflows; it does not turn demo screens into complete product modules.
