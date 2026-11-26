import { QueryClient, dehydrate, hydrate } from "@tanstack/react-query"
import type { AnyRouteMatch } from "@tanstack/react-router"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { SESSION_EXPIRED_CODE } from "~/src/integrations/better-auth/auth.errors"
import { ROLE_CODES, type Role } from "~/src/integrations/better-auth/auth.roles"
import {
  recheckRefusedSession,
  recordUserDataOwner,
  redirectAfterAuth,
  redirectIfSignedIn,
  requireAdmin,
  requireSignedIn,
} from "~/src/integrations/better-auth/auth.routes"
import { type getCurrentSession, getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import type { AuthSearch } from "~/src/integrations/better-auth/auth.zod"
import { resolveLocale } from "~/src/integrations/use-intl/i18n.middleware"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import { SESSION_QUERY_KEYS, SESSION_STALE_TIME_MS } from "~/src/modules/session/session.constants"

import { starCountQuery } from "~/src/lib/github"

const getSession = vi.hoisted(() => vi.fn<typeof getCurrentSession>())
vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const original = await importOriginal()
  return {
    ...original,
    getCurrentSessionQuery: { ...original.getCurrentSessionQuery, queryFn: getSession },
    recheckSessionQuery: { ...original.recheckSessionQuery, queryFn: getSession },
  }
})
const trackedQueryClient = (): QueryClient => {
  const queryClient = new QueryClient()
  queryClient.getQueryCache().subscribe(() => {
    recordUserDataOwner(queryClient)
  })
  return queryClient
}
const routeContext = (queryClient = trackedQueryClient()) => ({ context: { queryClient } })
const protectedPageContext = (publicHref = "/app", cause: AnyRouteMatch["cause"] = "enter") => ({
  ...routeContext(),
  cause,
  location: { publicHref },
})
const authPageContext = (search: AuthSearch = {}) => ({ ...routeContext(), search })
beforeEach(() => {
  getSession.mockReset()
})
afterEach(() => {
  vi.useRealTimers()
})
const outliveTheCachedSession = (): void => {
  vi.useFakeTimers({ now: Date.now() + SESSION_STALE_TIME_MS + 1 })
}
const session = (role: Role) => getSession.mockResolvedValue(createAuthSessionFixture({ role }))
const signedOut = () => getSession.mockResolvedValue(null)

describe("route authorization and locale handling", () => {
  it("redirects a signed-out callback to sign-in", async () => {
    signedOut()
    await expect(redirectAfterAuth(authPageContext())).rejects.toHaveProperty("options.to", "/auth/sign-in")
  })
  it("redirects an admin callback to the admin area", async () => {
    session(ROLE_CODES.ADMIN)
    await expect(redirectAfterAuth(authPageContext())).rejects.toHaveProperty("options.to", "/admin")
  })
  it("redirects a customer callback to the app area", async () => {
    session(ROLE_CODES.CUSTOMER)
    await expect(redirectAfterAuth(authPageContext())).rejects.toHaveProperty("options.to", "/app")
  })
  it("protects app routes", async () => {
    signedOut()
    await expect(requireSignedIn(protectedPageContext())).rejects.toHaveProperty("options.to", "/auth/sign-in")
  })
  it("protects admin routes", async () => {
    signedOut()
    await expect(requireAdmin(protectedPageContext())).rejects.toHaveProperty("options.to", "/auth/sign-in")
  })
  it("redirects customers out of the admin area", async () => {
    session(ROLE_CODES.CUSTOMER)
    await expect(requireAdmin(protectedPageContext())).rejects.toHaveProperty("options.to", "/app")
  })
  it("allows admins and supplies the route session", async () => {
    session(ROLE_CODES.ADMIN)
    await expect(requireAdmin(protectedPageContext())).resolves.toHaveProperty("session.user.role", "admin")
  })
  it("allows signed-out visitors on guest routes", async () => {
    signedOut()
    await expect(redirectIfSignedIn(authPageContext())).resolves.toBeUndefined()
  })
  it.each([
    [ROLE_CODES.ADMIN, "/admin"],
    [ROLE_CODES.CUSTOMER, "/app"],
  ] as const)("redirects signed-in %s away from guest routes", async (role, to) => {
    session(role)
    await expect(redirectIfSignedIn(authPageContext())).rejects.toHaveProperty("options", expect.objectContaining({ replace: true, to }))
  })
  it("admits navigations on the cached session while it is fresh, without asking the server again", async () => {
    const context = protectedPageContext()
    session(ROLE_CODES.ADMIN)
    await requireAdmin(context)
    await requireAdmin(context)
    await requireAdmin(context)
    expect(getSession).toHaveBeenCalledOnce()
  })
  it("rechecks a cached admin session once it is stale and rejects it after revocation", async () => {
    const context = protectedPageContext()
    session(ROLE_CODES.ADMIN)
    await requireAdmin(context)
    signedOut()
    outliveTheCachedSession()
    await expect(requireAdmin(context)).rejects.toHaveProperty("options.to", "/auth/sign-in")
    expect(context.context.queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toBeNull()
    expect(getSession).toHaveBeenCalledTimes(2)
  })
  it("tells a visitor moving within the workspace that the session ended after another check already emptied the cached session", async () => {
    const context = protectedPageContext("/app/settings", "stay")
    context.context.queryClient.setQueryData(getCurrentSessionQuery.queryKey, null)
    await expect(requireSignedIn(context)).rejects.toHaveProperty(
      "options",
      expect.objectContaining({ search: { error: SESSION_EXPIRED_CODE, redirect: "/app/settings" }, to: "/auth/sign-in" }),
    )
    expect(getSession).not.toHaveBeenCalled()
  })
  it("rechecks a stale admin role instead of trusting it", async () => {
    const context = protectedPageContext()
    session(ROLE_CODES.ADMIN)
    await requireAdmin(context)
    session(ROLE_CODES.CUSTOMER)
    outliveTheCachedSession()
    await expect(requireAdmin(context)).rejects.toHaveProperty("options.to", "/app")
  })
  it("shares an in-flight session check and caches it for page consumers", async () => {
    const context = protectedPageContext()
    const currentSession = createAuthSessionFixture()
    const pending = Promise.withResolvers<typeof currentSession>()
    getSession.mockReturnValue(pending.promise)
    const checks = Promise.all([requireSignedIn(context), requireSignedIn(context)])
    pending.resolve(currentSession)
    await expect(checks).resolves.toEqual([{ session: currentSession }, { session: currentSession }])
    expect(getSession).toHaveBeenCalledOnce()
    expect(context.context.queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toEqual(currentSession)
  })
  it("rechecks the session after a sign-in even while the cached one is fresh", async () => {
    const context = authPageContext()
    signedOut()
    await redirectIfSignedIn(context)
    session(ROLE_CODES.CUSTOMER)
    await expect(redirectAfterAuth(context)).rejects.toHaveProperty("options.to", "/app")
    expect(getSession).toHaveBeenCalledTimes(2)
  })
  it("keeps server failures as errors instead of granting access or looping through sign-in", async () => {
    const error = new Error("Session service unavailable")
    getSession.mockRejectedValue(error)
    await expect(requireSignedIn(protectedPageContext())).rejects.toBe(error)
    expect(getSession).toHaveBeenCalledOnce()
  })
  it("allows unprefixed app paths through locale handling before their route guard", () => {
    expect(resolveLocale(new Request("http://localhost/app"))).toEqual({})
  })
  it("does not treat unknown prefixes as locales", () => {
    expect(resolveLocale(new Request("http://localhost/xx/admin"))).toEqual({})
  })
  it("canonicalizes existing short locale links before routing", () => {
    expect(resolveLocale(new Request("http://localhost/pl/docs")).redirect?.headers.get("location")).toBe("http://localhost/pl-PL/docs")
  })
})

const anotherAccount = () => createAuthSessionFixture({ userId: "another-customer" })

const fetchSessionElsewhere = async (queryClient: QueryClient): Promise<void> => {
  await queryClient.query({ ...getCurrentSessionQuery, staleTime: 0 })
}

describe("cached data when the visitor changes", () => {
  const STAR_COUNT = 441

  const fillCache = async (queryClient: QueryClient): Promise<void> => {
    await queryClient.query({ ...starCountQuery, queryFn: () => STAR_COUNT })
    queryClient.setQueryData(SESSION_QUERY_KEYS.ACTIVE, [{ id: "previous-session" }])
    queryClient.getMutationCache().build(queryClient, { mutationKey: ACCOUNT_MUTATION_KEYS.CHANGE_PASSWORD })
  }

  const expectOnlyPublicData = (queryClient: QueryClient): void => {
    expect(queryClient.getQueryData(starCountQuery.queryKey)).toBe(STAR_COUNT)
    expect(queryClient.getQueryData(SESSION_QUERY_KEYS.ACTIVE)).toBeUndefined()
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0)
  }

  const expectDataKept = (queryClient: QueryClient): void => {
    expect(queryClient.getQueryData(starCountQuery.queryKey)).toBe(STAR_COUNT)
    expect(queryClient.getQueryData(SESSION_QUERY_KEYS.ACTIVE)).toEqual([{ id: "previous-session" }])
    expect(queryClient.getMutationCache().getAll()).toHaveLength(1)
  }

  it("keeps what a page loaded before its first session check when that check finds a signed-in account", async () => {
    const context = protectedPageContext()
    await fillCache(context.context.queryClient)
    session(ROLE_CODES.CUSTOMER)
    await requireSignedIn(context)
    expectDataKept(context.context.queryClient)
  })
  it("keeps what a guest's page loaded when its first session check finds no session", async () => {
    const context = authPageContext()
    await fillCache(context.context.queryClient)
    signedOut()
    await redirectIfSignedIn(context)
    expectDataKept(context.context.queryClient)
  })
  it("keeps the data of a page whose session check another component started first", async () => {
    const context = protectedPageContext()
    const { queryClient } = context.context
    await fillCache(queryClient)
    const pending = Promise.withResolvers<ReturnType<typeof createAuthSessionFixture>>()
    getSession.mockReturnValue(pending.promise)
    const elsewhere = fetchSessionElsewhere(queryClient)
    const guarded = requireSignedIn(context)
    pending.resolve(createAuthSessionFixture())
    await Promise.all([elsewhere, guarded])
    expectDataKept(queryClient)
    expect(getSession).toHaveBeenCalledOnce()
  })
  it("removes what a guest loaded and keeps public data when the guest signs in", async () => {
    const context = authPageContext()
    signedOut()
    await redirectIfSignedIn(context)
    await fillCache(context.context.queryClient)
    session(ROLE_CODES.CUSTOMER)
    await expect(redirectAfterAuth(context)).rejects.toHaveProperty("options.to", "/app")
    expectOnlyPublicData(context.context.queryClient)
  })
  it("removes the account's data and keeps public data when its session ends", async () => {
    const context = protectedPageContext()
    session(ROLE_CODES.CUSTOMER)
    await requireSignedIn(context)
    await fillCache(context.context.queryClient)
    signedOut()
    outliveTheCachedSession()
    await expect(requireSignedIn(context)).rejects.toHaveProperty("options.to", "/auth/sign-in")
    expectOnlyPublicData(context.context.queryClient)
    expect(context.context.queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toBeNull()
  })
  it("removes the previous account's data and keeps public data when another account signs in", async () => {
    const context = protectedPageContext()
    session(ROLE_CODES.CUSTOMER)
    await requireSignedIn(context)
    await fillCache(context.context.queryClient)
    const nextSession = anotherAccount()
    getSession.mockResolvedValue(nextSession)
    outliveTheCachedSession()
    await expect(requireSignedIn(context)).resolves.toEqual({ session: nextSession })
    expectOnlyPublicData(context.context.queryClient)
    expect(context.context.queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toEqual(nextSession)
  })
  it("removes the previous account's data at the next check when a component fetched the session again and found another account", async () => {
    const context = protectedPageContext()
    const { queryClient } = context.context
    session(ROLE_CODES.CUSTOMER)
    await requireSignedIn(context)
    await fillCache(queryClient)
    const nextSession = anotherAccount()
    getSession.mockResolvedValue(nextSession)
    await fetchSessionElsewhere(queryClient)
    await expect(requireSignedIn(context)).resolves.toEqual({ session: nextSession })
    expectOnlyPublicData(queryClient)
    expect(getSession).toHaveBeenCalledTimes(2)
  })
  it("removes the previous account's data when the cached session was dropped before another account signed in", async () => {
    const context = protectedPageContext()
    const { queryClient } = context.context
    session(ROLE_CODES.CUSTOMER)
    await requireSignedIn(context)
    await fillCache(queryClient)
    queryClient.removeQueries({ exact: true, queryKey: getCurrentSessionQuery.queryKey })
    getSession.mockResolvedValue(anotherAccount())
    await requireSignedIn(context)
    expectOnlyPublicData(queryClient)
  })
  it("keeps the account's data when a recheck finds the same account", async () => {
    const context = protectedPageContext()
    session(ROLE_CODES.CUSTOMER)
    await requireSignedIn(context)
    await fillCache(context.context.queryClient)
    outliveTheCachedSession()
    await requireSignedIn(context)
    expectDataKept(context.context.queryClient)
    expect(getSession).toHaveBeenCalledTimes(2)
  })
  it("treats the data of a server-rendered page as the account the server found, in the browser that receives it", async () => {
    const server = protectedPageContext()
    session(ROLE_CODES.CUSTOMER)
    await requireSignedIn(server)
    await fillCache(server.context.queryClient)
    const browser = protectedPageContext()
    hydrate(browser.context.queryClient, dehydrate(server.context.queryClient))
    getSession.mockResolvedValue(anotherAccount())
    await fetchSessionElsewhere(browser.context.queryClient)
    await requireSignedIn(browser)
    expect(browser.context.queryClient.getQueryData(SESSION_QUERY_KEYS.ACTIVE)).toBeUndefined()
  })
  it("clears the data at the first check when nothing records whose it is", async () => {
    const context = routeContext(new QueryClient())
    await fillCache(context.context.queryClient)
    session(ROLE_CODES.CUSTOMER)
    await requireSignedIn({ ...context, cause: "enter", location: { publicHref: "/app" } })
    expectOnlyPublicData(context.context.queryClient)
  })
})

describe("return path through authentication", () => {
  it("sends a signed-out visitor to sign-in with the page they asked for as the return path", async () => {
    signedOut()
    await expect(requireSignedIn(protectedPageContext("/pl-PL/app/settings"))).rejects.toHaveProperty(
      "options",
      expect.objectContaining({ search: { redirect: "/pl-PL/app/settings" }, to: "/auth/sign-in" }),
    )
  })
  it("returns a signed-in visitor from a guest page to the return path instead of the workspace", async () => {
    session(ROLE_CODES.CUSTOMER)
    await expect(redirectIfSignedIn(authPageContext({ redirect: "/pl-PL/app/settings" }))).rejects.toHaveProperty(
      "options",
      expect.objectContaining({ href: "/pl-PL/app/settings", replace: true }),
    )
  })
  it("continues a callback to the return path", async () => {
    session(ROLE_CODES.ADMIN)
    await expect(redirectAfterAuth(authPageContext({ redirect: "/admin/users/all" }))).rejects.toHaveProperty(
      "options",
      expect.objectContaining({ href: "/admin/users/all", replace: true }),
    )
  })
  it("keeps the return path when a signed-out callback goes back to sign-in", async () => {
    signedOut()
    await expect(redirectAfterAuth(authPageContext({ redirect: "/app/settings" }))).rejects.toHaveProperty(
      "options",
      expect.objectContaining({ search: { redirect: "/app/settings" }, to: "/auth/sign-in" }),
    )
  })
})

const guardedRouter = () => ({ invalidate: vi.fn<() => Promise<void>>().mockResolvedValue(undefined), isServer: false })

const signedInContext = async (role: Role) => {
  const context = protectedPageContext("/admin/courses")
  session(role)
  await requireSignedIn(context)
  return context
}

describe("a server function that refuses the cached session", () => {
  it("runs the guards again when the session has ended, and they send the visitor to sign in with the expired notice", async () => {
    const context = await signedInContext(ROLE_CODES.ADMIN)
    const { queryClient } = context.context
    queryClient.setQueryData(SESSION_QUERY_KEYS.ACTIVE, [{ id: "previous-session" }])
    const watched = guardedRouter()
    signedOut()
    await recheckRefusedSession({ error: new Error(ERROR_CODES.UNAUTHORIZED), queryClient, router: watched })
    expect(watched.invalidate).toHaveBeenCalledOnce()
    await expect(requireAdmin(context)).rejects.toHaveProperty(
      "options",
      expect.objectContaining({ search: { error: SESSION_EXPIRED_CODE, redirect: "/admin/courses" }, to: "/auth/sign-in" }),
    )
    expect(queryClient.getQueryData(SESSION_QUERY_KEYS.ACTIVE)).toBeUndefined()
  })
  it("runs the guards again when the account lost the role a page needs", async () => {
    const context = await signedInContext(ROLE_CODES.ADMIN)
    const watched = guardedRouter()
    session(ROLE_CODES.CUSTOMER)
    await recheckRefusedSession({ error: new Error(ERROR_CODES.FORBIDDEN), queryClient: context.context.queryClient, router: watched })
    expect(watched.invalidate).toHaveBeenCalledOnce()
    await expect(requireAdmin(context)).rejects.toHaveProperty("options.to", "/app")
  })
  it("leaves the page alone when the session is unchanged, so a refusal can never loop", async () => {
    const context = await signedInContext(ROLE_CODES.ADMIN)
    const watched = guardedRouter()
    await recheckRefusedSession({ error: new Error(ERROR_CODES.FORBIDDEN), queryClient: context.context.queryClient, router: watched })
    expect(getSession).toHaveBeenCalledTimes(2)
    expect(watched.invalidate).not.toHaveBeenCalled()
    await requireAdmin(context)
    expect(getSession).toHaveBeenCalledTimes(2)
  })
  it("keeps the session the page has when the recheck itself fails", async () => {
    const context = await signedInContext(ROLE_CODES.ADMIN)
    const watched = guardedRouter()
    getSession.mockRejectedValue(new Error("Session service unavailable"))
    await recheckRefusedSession({ error: new Error(ERROR_CODES.UNAUTHORIZED), queryClient: context.context.queryClient, router: watched })
    expect(watched.invalidate).not.toHaveBeenCalled()
    await expect(requireAdmin(context)).resolves.toHaveProperty("session.user.role", ROLE_CODES.ADMIN)
  })
  it("ignores every other error", async () => {
    const context = await signedInContext(ROLE_CODES.ADMIN)
    const watched = guardedRouter()
    await recheckRefusedSession({ error: new Error(ERROR_CODES.INTERNAL_ERROR), queryClient: context.context.queryClient, router: watched })
    await recheckRefusedSession({ error: "not an error", queryClient: context.context.queryClient, router: watched })
    expect(getSession).toHaveBeenCalledOnce()
    expect(watched.invalidate).not.toHaveBeenCalled()
  })
  it("does nothing while rendering on the server, where the guards have just checked the session", async () => {
    const context = await signedInContext(ROLE_CODES.ADMIN)
    const watched = { ...guardedRouter(), isServer: true }
    signedOut()
    await recheckRefusedSession({ error: new Error(ERROR_CODES.UNAUTHORIZED), queryClient: context.context.queryClient, router: watched })
    expect(getSession).toHaveBeenCalledOnce()
    expect(watched.invalidate).not.toHaveBeenCalled()
  })
})
