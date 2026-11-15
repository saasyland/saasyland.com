import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"

import { EMPTY_PAGE, expectLocalizedAdminPage, expectPrefetched, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"
import { Route as UsersIndexRoute } from "~/src/routes/admin.users.index"

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

afterEach(() => vi.restoreAllMocks())

describe("admin user route loaders", () => {
  it.each(["/admin/users/all", "/admin/users/security"])("loads localized metadata for an authorized administrator at %s", async (path) => {
    expectLocalizedAdminPage(await loadAsAdmin(path))
  })

  it("populates required query data before rendering /admin/users/all", async () => {
    vi.spyOn(getUsersQuery, "queryFn")
    expectPrefetched(await loadAsAdmin("/admin/users/all"), getUsersQuery, { ...EMPTY_PAGE, pendingVerification: 0 })
  })

  it("redirects the users index to the complete user list", async () => {
    await loadAsAdmin("/admin/users")
    const beforeLoad = vi.fn(UsersIndexRoute.options.beforeLoad)
    expect(beforeLoad).toThrow()
    expect(beforeLoad.mock.results[0]?.value).toHaveProperty("options.to", "/admin/users/all")
  })
})
