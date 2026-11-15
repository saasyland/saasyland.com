import { afterEach, it, vi } from "vite-plus/test"

import { expectLocalizedAdminPage, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

afterEach(() => vi.restoreAllMocks())

it("loads localized metadata for an authorized administrator at /admin/analytics", async () => {
  expectLocalizedAdminPage(await loadAsAdmin("/admin/analytics"))
})
