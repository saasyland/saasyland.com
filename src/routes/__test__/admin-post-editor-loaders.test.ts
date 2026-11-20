import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { expectLocalizedAdminPage, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

import { getRouter } from "~/src/router"

afterEach(() => vi.restoreAllMocks())

describe("admin post editor route loaders", () => {
  it.each(["/admin/blog", "/admin/blog/create"])("loads localized metadata for an authorized administrator at %s", async (path) => {
    expectLocalizedAdminPage(await loadAsAdmin(path))
  })

  it.each([
    ["table", "table"],
    ["grid", "grid"],
    [undefined, "grid"],
    ["invalid", "grid"],
    [12, "grid"],
  ])("validates the requested blog view: %s", (view, expected) => {
    const router = getRouter()
    expect(router.matchRoutes("/admin/blog", { view }).at(-1)?.search).toMatchObject({ view: expected })
  })
})
