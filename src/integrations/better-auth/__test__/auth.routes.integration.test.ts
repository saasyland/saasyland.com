import { QueryClient } from "@tanstack/react-query"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { redirectAfterAuth, redirectIfSignedIn, requireAdmin, requireSignedIn } from "~/src/integrations/better-auth/auth.routes"
import { type getCurrentSession, getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import type { AuthSearch } from "~/src/integrations/better-auth/auth.zod"
import { resolveLocale } from "~/src/integrations/use-intl/i18n.middleware"

import { LICENSE_QUERY_KEYS } from "~/src/modules/license/license.constants"

const getSession = vi.hoisted(() => vi.fn<typeof getCurrentSession>())
vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const original = await importOriginal()
  return { ...original, getCurrentSessionQuery: { ...original.getCurrentSessionQuery, queryFn: getSession } }
})
const routeContext = () => ({ context: { queryClient: new QueryClient() } })
const protectedPageContext = (publicHref = "/app") => ({ ...routeContext(), location: { publicHref } })
const authPageContext = (search: AuthSearch = {}) => ({ ...routeContext(), search })
beforeEach(() => {
  getSession.mockReset()
})
const session = (role: "admin" | "customer") => getSession.mockResolvedValue(createAuthSessionFixture({ role }))
const signedOut = () => getSession.mockResolvedValue(null)

describe("route authorization and locale handling", () => {
  it("redirects a signed-out callback to sign-in", async () => {
    signedOut()
    await expect(redirectAfterAuth(authPageContext())).rejects.toHaveProperty("options.to", "/auth/sign-in")
  })
  it("redirects an admin callback to the admin area", async () => {
    session("admin")
    await expect(redirectAfterAuth(authPageContext())).rejects.toHaveProperty("options.to", "/admin")
  })
  it("redirects a customer callback to the app area", async () => {
    session("customer")
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
    session("customer")
    await expect(requireAdmin(protectedPageContext())).rejects.toHaveProperty("options.to", "/app")
  })
  it("allows admins and supplies the route session", async () => {
    session("admin")
    await expect(requireAdmin(protectedPageContext())).resolves.toHaveProperty("session.user.role", "admin")
  })
  it("allows signed-out visitors on guest routes", async () => {
    signedOut()
    await expect(redirectIfSignedIn(authPageContext())).resolves.toBeUndefined()
  })
  it.each([
    ["admin", "/admin"],
    ["customer", "/app"],
  ] as const)("redirects signed-in %s away from guest routes", async (role, to) => {
    session(role)
    await expect(redirectIfSignedIn(authPageContext())).rejects.toHaveProperty("options", expect.objectContaining({ replace: true, to }))
  })
  it("rechecks a cached admin session and rejects it after revocation", async () => {
    const context = protectedPageContext()
    session("admin")
    await requireAdmin(context)
    context.context.queryClient.setQueryData(LICENSE_QUERY_KEYS.CURRENT, { key: "previous-license" })
    signedOut()
    await expect(requireAdmin(context)).rejects.toHaveProperty("options.to", "/auth/sign-in")
    expect(context.context.queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toBeNull()
    expect(context.context.queryClient.getQueryData(LICENSE_QUERY_KEYS.CURRENT)).toBeUndefined()
    expect(getSession).toHaveBeenCalledTimes(2)
  })
  it("clears the previous account's cached data when the session changes to another account", async () => {
    const context = protectedPageContext()
    session("customer")
    await requireSignedIn(context)
    context.context.queryClient.setQueryData(LICENSE_QUERY_KEYS.CURRENT, { key: "previous-license" })
    const nextSession = createAuthSessionFixture({ userId: "another-customer" })
    getSession.mockResolvedValue(nextSession)
    await expect(requireSignedIn(context)).resolves.toEqual({ session: nextSession })
    expect(context.context.queryClient.getQueryData(LICENSE_QUERY_KEYS.CURRENT)).toBeUndefined()
    expect(context.context.queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toEqual(nextSession)
  })
  it("rechecks roles instead of trusting a cached admin role", async () => {
    const context = protectedPageContext()
    session("admin")
    await requireAdmin(context)
    session("customer")
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
  it("reuses the session for link preloads but rechecks before actual navigation", async () => {
    const context = protectedPageContext()
    session("admin")
    await requireAdmin(context)
    await requireAdmin({ ...context, preload: true })
    await requireAdmin({ ...context, preload: true })
    expect(getSession).toHaveBeenCalledOnce()

    signedOut()
    await expect(requireAdmin(context)).rejects.toHaveProperty("options.to", "/auth/sign-in")
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

describe("return path through authentication", () => {
  it("sends a signed-out visitor to sign-in with the page they asked for as the return path", async () => {
    signedOut()
    await expect(requireSignedIn(protectedPageContext("/pl-PL/app/license"))).rejects.toHaveProperty(
      "options",
      expect.objectContaining({ search: { redirect: "/pl-PL/app/license" }, to: "/auth/sign-in" }),
    )
  })
  it("returns a signed-in visitor from a guest page to the return path instead of the workspace", async () => {
    session("customer")
    await expect(redirectIfSignedIn(authPageContext({ redirect: "/pl-PL/app/license" }))).rejects.toHaveProperty(
      "options",
      expect.objectContaining({ href: "/pl-PL/app/license", replace: true }),
    )
  })
  it("continues a callback to the return path", async () => {
    session("admin")
    await expect(redirectAfterAuth(authPageContext({ redirect: "/admin/users/all" }))).rejects.toHaveProperty(
      "options",
      expect.objectContaining({ href: "/admin/users/all", replace: true }),
    )
  })
  it("keeps the return path when a signed-out callback goes back to sign-in", async () => {
    signedOut()
    await expect(redirectAfterAuth(authPageContext({ redirect: "/app/license" }))).rejects.toHaveProperty(
      "options",
      expect.objectContaining({ search: { redirect: "/app/license" }, to: "/auth/sign-in" }),
    )
  })
})
