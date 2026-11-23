import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { invitation } from "~/src/modules/invitation/invitation.schema"
import { listInvitationsQuery } from "~/src/modules/invitation/use-cases/list-invitations"
import { listUserSessionsQuery } from "~/src/modules/session/use-cases/list-user-sessions"
import { getUserQuery } from "~/src/modules/user/use-cases/get-user"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import { user } from "~/src/modules/user/user.schema"

import { EMPTY_PAGE, expectLocalizedAdminPage, expectPrefetched, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"
import { Route as UsersIndexRoute } from "~/src/routes/admin.users.index"

afterEach(() => vi.restoreAllMocks())

describe("admin user route loaders", () => {
  it("loads localized metadata for an authorized administrator at /admin/users/all", async () => {
    expectLocalizedAdminPage(await loadAsAdmin("/admin/users/all"))
  })

  it("populates required query data before rendering /admin/users/all", async () => {
    vi.spyOn(getUsersQuery, "queryFn")
    expectPrefetched(await loadAsAdmin("/admin/users/all"), getUsersQuery, { ...EMPTY_PAGE, pendingVerification: 0 })
  })

  it("loads localized metadata and the open invitations before rendering /admin/users/invitations", async () => {
    await db.delete(invitation)
    vi.spyOn(listInvitationsQuery, "queryFn")

    const router = await loadAsAdmin("/admin/users/invitations")

    expectLocalizedAdminPage(router)
    expectPrefetched(router, listInvitationsQuery, [])
  })

  it("titles a user's profile after them and loads their account and sessions", async () => {
    await db.delete(user)
    await db.insert(user).values({ email: "grace@example.test", id: "grace", name: "Grace Hopper", role: ROLE_CODES.CUSTOMER })
    vi.spyOn(auth.api, "listUserSessions").mockResolvedValue({ sessions: [] })

    const router = await loadAsAdmin("/admin/users/grace")

    expect(router.state.matches.at(-1)?.loaderData).toStrictEqual({
      locale: "en-US",
      pathname: "/admin/users/grace",
      title: "Grace Hopper",
    })
    expect(router.options.context.queryClient.getQueryData(getUserQuery({ userId: "grace" }).queryKey)).toHaveProperty(
      "name",
      "Grace Hopper",
    )
    expect(router.options.context.queryClient.getQueryData(listUserSessionsQuery({ userId: "grace" }).queryKey)).toStrictEqual([])
  })

  it("answers a profile of a user who does not exist with not found", async () => {
    await db.delete(user)
    vi.spyOn(auth.api, "listUserSessions").mockResolvedValue({ sessions: [] })

    const router = await loadAsAdmin("/admin/users/missing")

    expect(router.state.matches.some((match) => match.status === "notFound")).toBe(true)
  })

  it("redirects the users index to the complete user list", async () => {
    await loadAsAdmin("/admin/users")
    const beforeLoad = vi.fn(UsersIndexRoute.options.beforeLoad)
    expect(beforeLoad).toThrow()
    expect(beforeLoad.mock.results[0]?.value).toHaveProperty("options.to", "/admin/users/all")
  })
})
