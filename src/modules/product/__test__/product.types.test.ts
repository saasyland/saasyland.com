import { describe, expect, it } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { PRODUCT_STATUS, PRODUCT_TYPE } from "~/src/modules/product/product.constants"
import type { Product } from "~/src/modules/product/product.types"

const PRODUCT_ID = "01900000-0000-7000-8000-000000000002"

const makeProductRow = (overrides: Partial<Product["select"]> = {}): Product["select"] => ({
  billingCycle: JSON_NULL,
  createdAt: new Date("2026-01-01T00:00:00.000Z"),
  currency: DEFAULT_CURRENCY_CODE,
  description: "",
  id: PRODUCT_ID,
  name: "Starter",
  priceCents: 9900,
  status: PRODUCT_STATUS.DRAFT,
  type: PRODUCT_TYPE.ONE_TIME,
  updatedAt: new Date("2026-01-01T00:00:00.000Z"),
  ...overrides,
})

describe("product types", () => {
  it("builds a select row fixture aligned with the product table", () => {
    expect.hasAssertions()
    expect(makeProductRow().name).toBe("Starter")
    expect(makeProductRow({ status: PRODUCT_STATUS.PUBLISHED }).status).toBe(PRODUCT_STATUS.PUBLISHED)
  })
})
