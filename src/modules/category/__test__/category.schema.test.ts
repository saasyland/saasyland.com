import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { describe, expect, it } from "vite-plus/test"

import { CATEGORY_ICONS, CATEGORY_KINDS, CATEGORY_VISIBILITIES, category } from "~/src/modules/category/category.schema"

describe("category schema", () => {
  it("materializes through drizzle adapter", () => {
    expect.hasAssertions()
    expect(
      drizzleAdapter(
        {},
        {
          provider: "sqlite",
          schema: { category },
        },
      ),
    ).toBeDefined()
  })

  it("defines enums and updatedAt onUpdate", () => {
    expect.hasAssertions()
    expect(CATEGORY_ICONS).toStrictEqual(["Archive", "FolderOpen", "Puzzle"])
    expect(CATEGORY_KINDS).toStrictEqual(["category", "collection"])
    expect(CATEGORY_VISIBILITIES).toStrictEqual(["public", "hidden"])
    const onUpdate = category.updatedAt.onUpdateFn
    expect(onUpdate).toBeDefined()
    expect(onUpdate?.()).toBeInstanceOf(Date)
  })
})
