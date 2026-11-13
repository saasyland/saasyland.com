import { describe, expect, it } from "vite-plus/test"

import { CATEGORY_ICON, CATEGORY_KIND, CATEGORY_VISIBILITY } from "~/src/modules/category/category.constants"
import type { Category } from "~/src/modules/category/category.types"

const CATEGORY_ID = "01900000-0000-7000-8000-000000000003"

const makeCategoryRow = (overrides: Partial<Category["select"]> = {}): Category["select"] => ({
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  description: "",
  icon: CATEGORY_ICON.FOLDER_OPEN,
  id: CATEGORY_ID,
  kind: CATEGORY_KIND.CATEGORY,
  name: "Guides",
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  visibility: CATEGORY_VISIBILITY.PUBLIC,
  ...overrides,
})

describe("category types", () => {
  it("builds a select row fixture aligned with the category table", () => {
    expect.hasAssertions()
    expect(makeCategoryRow().name).toBe("Guides")
    expect(makeCategoryRow({ kind: CATEGORY_KIND.COLLECTION }).kind).toBe(CATEGORY_KIND.COLLECTION)
  })
})
