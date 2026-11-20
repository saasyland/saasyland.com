import { afterEach, describe, it, vi } from "vite-plus/test"

import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { EMPTY_PAGE, expectLocalizedAdminPage, expectPrefetched, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

afterEach(() => vi.restoreAllMocks())

describe("admin route loaders", () => {
  it.each(["/admin", "/admin/settings"])("loads localized metadata for an authorized administrator at %s", async (path) => {
    expectLocalizedAdminPage(await loadAsAdmin(path))
  })

  it("populates required query data before rendering /admin", async () => {
    vi.spyOn(getUsersQuery, "queryFn")
    expectPrefetched(await loadAsAdmin("/admin"), getUsersQuery, { ...EMPTY_PAGE, pendingVerification: 0 })
  })

  it("populates required query data before rendering /admin/settings", async () => {
    vi.spyOn(getActiveSessionsQuery, "queryFn")
    expectPrefetched(await loadAsAdmin("/admin/settings"), getActiveSessionsQuery, [])
  })
})
