import { afterEach, it, vi } from "vite-plus/test"

import { expectLocalizedAdminPage, loadAsAdmin } from "~/src/routes/__test__/fixtures/admin-router"

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

afterEach(() => vi.restoreAllMocks())

it.each(["/admin/payments", "/admin/pricing-models"])("loads localized metadata for an authorized administrator at %s", async (path) => {
  expectLocalizedAdminPage(await loadAsAdmin(path))
})
