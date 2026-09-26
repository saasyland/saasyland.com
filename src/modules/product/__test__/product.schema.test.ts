import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { describe, expect, it } from "vite-plus/test"

import { PRODUCT_STATUSES, PRODUCT_TYPES, product } from "~/src/modules/product/product.schema"

describe("product schema", () => {
  it("materializes through drizzle adapter", () => {
    expect.hasAssertions()
    expect(
      drizzleAdapter(
        {},
        {
          provider: "sqlite",
          schema: { product },
        },
      ),
    ).toBeDefined()
  })

  it("defines enums and updatedAt onUpdate", () => {
    expect.hasAssertions()
    expect(PRODUCT_STATUSES).toStrictEqual(["draft", "published", "archived"])
    expect(PRODUCT_TYPES).toStrictEqual(["one_time", "subscription", "course"])
    const onUpdate = product.updatedAt.onUpdateFn
    expect(onUpdate).toBeDefined()
    expect(onUpdate?.()).toBeInstanceOf(Date)
  })
})
