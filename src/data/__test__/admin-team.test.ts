import { expect, it } from "vite-plus/test"

import { ADMIN_ROLE_ROWS } from "~/src/data/admin-team"

it("exports the role rows", () => {
  expect(ADMIN_ROLE_ROWS.length).toBeGreaterThan(0)
})
