import { afterEach, it, vi } from "vite-plus/test"

import { expectLocalizedAdminPage, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

afterEach(() => vi.restoreAllMocks())

it("loads localized metadata for an authorized administrator at /admin/landing-page", async () => {
  expectLocalizedAdminPage(await loadAsAdmin("/admin/landing-page"))
})
