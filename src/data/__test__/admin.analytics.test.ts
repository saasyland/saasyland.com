import { expect, it } from "vite-plus/test"

import { ADMIN_ANALYTICS_REGION_ROWS } from "~/src/data/admin"

it("exports the analytics region rows", () => {
  expect(ADMIN_ANALYTICS_REGION_ROWS.length).toBeGreaterThan(0)
})
