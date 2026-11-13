import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"

import type { polar } from "~/src/integrations/polar/polar.config"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import { pppDiscountId } from "~/src/modules/license/license.ppp"

const iterDiscountsMock = vi.hoisted(() => vi.fn<typeof polar.discounts.iterList>())

vi.mock(import("~/src/integrations/polar/polar.config"), async (importOriginal) => {
  const actual = await importOriginal()
  vi.spyOn(actual.polar.discounts, "iterList").mockImplementation(iterDiscountsMock)
  return actual
})

const DISCOUNT_FIELDS = {
  code: JSON_NULL,
  created_at: "2026-09-08T00:00:00.000Z",
  duration: "once" as const,
  ends_at: JSON_NULL,
  max_redemptions: JSON_NULL,
  max_redemptions_per_customer: JSON_NULL,
  metadata: {},
  modified_at: JSON_NULL,
  name: "Regional discount",
  organization_id: env.POLAR_ORGANIZATION_ID,
  products: [],
  redemptions_count: 0,
  starts_at: JSON_NULL,
}

const percentageDiscount = (id: string, basisPoints: number, code: string | null = JSON_NULL): models.Discount => ({
  ...DISCOUNT_FIELDS,
  basis_points: basisPoints,
  code,
  id,
  type: "percentage",
})

const discountPages = async function* discountPages(
  ...pages: (models.Discount[] | Promise<models.Discount[]>)[]
): AsyncGenerator<models.Discount> {
  for (const page of pages) {
    yield* await page
  }
}

const discountProduct = (id: string): models.Discount["products"][number] => ({
  created_at: DISCOUNT_FIELDS.created_at,
  description: JSON_NULL,
  id,
  is_archived: false,
  is_recurring: false,
  metadata: {},
  meter_interval: JSON_NULL,
  meter_interval_count: JSON_NULL,
  modified_at: JSON_NULL,
  name: "License",
  organization_id: env.POLAR_ORGANIZATION_ID,
  recurring_interval: JSON_NULL,
  recurring_interval_count: JSON_NULL,
  trial_interval: JSON_NULL,
  trial_interval_count: JSON_NULL,
  visibility: "public",
})

const findDiscount = async (country?: string, productId = env.POLAR_PRODUCT_ID_CORE): Promise<string | undefined> => {
  const headers = new Headers()
  if (country !== undefined) {
    headers.set(COUNTRY_HEADER, country)
  }
  const discountId = await pppDiscountId(headers, productId)
  await flushWaitUntil()
  return discountId
}

const FIVE_MINUTES_MS = 300_000
const LISTING_FAILED = "[ppp] Polar discounts could not be listed; checkout continues with the discounts found so far"

const NOW = Date.parse("2026-09-09T12:00:00Z")

beforeEach(() => {
  iterDiscountsMock.mockReset()
  vi.spyOn(Date, "now").mockReturnValue(NOW)
  vi.spyOn(console, "error").mockImplementation(() => {})
})

afterEach(() => {
  vi.mocked(Date.now).mockRestore()
  vi.mocked(console.error).mockRestore()
})

describe("regional checkout discounts", () => {
  it.each([undefined, "US", "XX"])("skips the provider for a full-price or missing country: %j", async (country) => {
    await expect(findDiscount(country)).resolves.toBeUndefined()

    expect(iterDiscountsMock).not.toHaveBeenCalled()
  })

  it("charges the full price when the buyer turned regional pricing off", async () => {
    const headers = new Headers({ [COUNTRY_HEADER]: "PL", cookie: "session=kept; regional_pricing=off" })

    await expect(pppDiscountId(headers, env.POLAR_PRODUCT_ID_CORE)).resolves.toBeUndefined()
    expect(iterDiscountsMock).not.toHaveBeenCalled()
  })

  it("finds automatic percentage discounts across pages while excluding coupon codes and fixed amounts", async () => {
    const fixed: models.Discount = { ...DISCOUNT_FIELDS, amount: 3000, amounts: { usd: 3000 }, currency: "usd", id: "fixed", type: "fixed" }
    iterDiscountsMock.mockImplementation(() =>
      discountPages(
        [
          percentageDiscount("regional-30", 3000),
          percentageDiscount("fractional", 3001),
          percentageDiscount("coupon-30", 3000, "LAUNCH30"),
          fixed,
        ],
        [percentageDiscount("regional-50", 5000)],
      ),
    )

    await expect(findDiscount("PL")).resolves.toBe("regional-30")
    await expect(findDiscount("UA")).resolves.toBe("regional-50")
    await expect(findDiscount("IN")).resolves.toBeUndefined()
    expect(iterDiscountsMock).toHaveBeenCalledExactlyOnceWith({ limit: 100, organization_id: env.POLAR_ORGANIZATION_ID })
  })

  it("stores the list in KV, so later checkouts on any isolate reuse it", async () => {
    iterDiscountsMock.mockImplementation(() =>
      discountPages([percentageDiscount("regional-30", 3000), percentageDiscount("regional-50", 5000)]),
    )

    await expect(findDiscount("PL")).resolves.toBe("regional-30")
    await expect(findDiscount("UA")).resolves.toBe("regional-50")

    expect(iterDiscountsMock).toHaveBeenCalledTimes(1)
    await expect(env.CACHE.get("polar:regional-discounts", "json")).resolves.toMatchObject({ fetchedAt: NOW })
  })

  it("lists again when the stored entry is not one it wrote", async () => {
    await env.CACHE.put("polar:regional-discounts", JSON.stringify({ discounts: "corrupt", fetchedAt: NOW }))
    iterDiscountsMock.mockImplementation(() => discountPages([percentageDiscount("regional-30", 3000)]))

    await expect(findDiscount("PL")).resolves.toBe("regional-30")
    expect(iterDiscountsMock).toHaveBeenCalledTimes(1)
  })

  it("allows checkout without a discount and logs why when the provider cannot list discounts", async () => {
    const error = new Error("Provider unavailable")
    iterDiscountsMock.mockImplementation(() => discountPages(Promise.reject(error)))

    await expect(findDiscount("PL")).resolves.toBeUndefined()

    expect(iterDiscountsMock).toHaveBeenCalledTimes(1)
    expect(console.error).toHaveBeenCalledWith(LISTING_FAILED, error)
    await expect(env.CACHE.get("polar:regional-discounts")).resolves.toBeNull()
  })

  it("retries a failed lookup on the next checkout and caches the recovered discounts", async () => {
    iterDiscountsMock
      .mockImplementationOnce(() => discountPages(Promise.reject(new Error("Provider unavailable"))))
      .mockImplementation(() => discountPages([percentageDiscount("regional-30", 3000)]))

    await expect(findDiscount("PL")).resolves.toBeUndefined()
    await expect(findDiscount("PL")).resolves.toBe("regional-30")
    await expect(findDiscount("PL")).resolves.toBe("regional-30")
    expect(iterDiscountsMock).toHaveBeenCalledTimes(2)
  })

  it("retries an incomplete paginated lookup instead of permanently caching its first page", async () => {
    iterDiscountsMock
      .mockImplementationOnce(() =>
        discountPages([percentageDiscount("regional-30", 3000)], Promise.reject(new Error("Next page unavailable"))),
      )
      .mockImplementation(() => discountPages([percentageDiscount("regional-30", 3000), percentageDiscount("regional-50", 5000)]))

    await expect(findDiscount("PL")).resolves.toBe("regional-30")
    await expect(findDiscount("UA")).resolves.toBe("regional-50")
    expect(iterDiscountsMock).toHaveBeenCalledTimes(2)
  })
})

describe("regional discount eligibility", () => {
  it.each([
    { starts_at: new Date(NOW + 1).toISOString() },
    { ends_at: new Date(NOW).toISOString() },
    { ends_at: new Date(NOW - 1).toISOString() },
    { max_redemptions: 10, redemptions_count: 10 },
    { max_redemptions: 10, redemptions_count: 11 },
  ])("skips an ineligible discount without hiding a valid one: %j", async (restriction) => {
    iterDiscountsMock.mockImplementation(() =>
      discountPages([percentageDiscount("eligible", 3000), { ...percentageDiscount("ineligible", 3000), ...restriction }]),
    )

    await expect(findDiscount("PL")).resolves.toBe("eligible")
  })

  it("allows active discounts with remaining redemptions", async () => {
    iterDiscountsMock.mockImplementation(() =>
      discountPages([
        {
          ...percentageDiscount("eligible", 3000),
          ends_at: new Date(NOW + 1000).toISOString(),
          max_redemptions: 10,
          redemptions_count: 9,
          starts_at: new Date(NOW).toISOString(),
        },
      ]),
    )

    await expect(findDiscount("PL")).resolves.toBe("eligible")
  })

  it("checks cached start and end dates at checkout time", async () => {
    iterDiscountsMock.mockImplementation(() =>
      discountPages([
        {
          ...percentageDiscount("scheduled", 3000),
          ends_at: new Date(NOW + 2000).toISOString(),
          starts_at: new Date(NOW + 1000).toISOString(),
        },
      ]),
    )

    await expect(findDiscount("PL")).resolves.toBeUndefined()
    vi.mocked(Date.now).mockReturnValue(NOW + 1000)
    await expect(findDiscount("PL")).resolves.toBe("scheduled")
    vi.mocked(Date.now).mockReturnValue(NOW + 2000)
    await expect(findDiscount("PL")).resolves.toBeUndefined()
    expect(iterDiscountsMock).toHaveBeenCalledTimes(1)
  })

  it("resolves discounts for each requested product without mixing tiers", async () => {
    iterDiscountsMock.mockImplementation(() =>
      discountPages([
        { ...percentageDiscount("core-regional", 3000), products: [discountProduct(env.POLAR_PRODUCT_ID_CORE)] },
        { ...percentageDiscount("agency-regional", 3000), products: [discountProduct(env.POLAR_PRODUCT_ID_AGENCY)] },
      ]),
    )

    await expect(findDiscount("PL", env.POLAR_PRODUCT_ID_CORE)).resolves.toBe("core-regional")
    await expect(findDiscount("PL", env.POLAR_PRODUCT_ID_AGENCY)).resolves.toBe("agency-regional")
    await expect(findDiscount("PL", env.POLAR_PRODUCT_ID_COMPLETE)).resolves.toBeUndefined()
    expect(iterDiscountsMock).toHaveBeenCalledTimes(1)
  })
})

describe("regional discount cache refresh", () => {
  it("lists again after five minutes and never offers a discount that was removed", async () => {
    iterDiscountsMock.mockImplementationOnce(() => discountPages([percentageDiscount("removed", 3000)]))
    await expect(findDiscount("PL")).resolves.toBe("removed")

    iterDiscountsMock.mockImplementation(() => discountPages([percentageDiscount("new", 5000)]))
    vi.mocked(Date.now).mockReturnValue(NOW + FIVE_MINUTES_MS - 1)
    await expect(findDiscount("PL")).resolves.toBe("removed")
    vi.mocked(Date.now).mockReturnValue(NOW + FIVE_MINUTES_MS)

    await expect(findDiscount("PL")).resolves.toBeUndefined()
    await expect(findDiscount("UA")).resolves.toBe("new")
    expect(iterDiscountsMock).toHaveBeenCalledTimes(2)
  })

  it("preserves undiscounted checkout after a failed refresh and retries the next request", async () => {
    iterDiscountsMock
      .mockImplementationOnce(() => discountPages([percentageDiscount("old", 3000)]))
      .mockImplementationOnce(() => discountPages(Promise.reject(new Error("Provider unavailable"))))
      .mockImplementation(() => discountPages([percentageDiscount("recovered", 3000)]))

    await expect(findDiscount("PL")).resolves.toBe("old")
    vi.mocked(Date.now).mockReturnValue(NOW + FIVE_MINUTES_MS)
    await expect(findDiscount("PL")).resolves.toBeUndefined()
    await expect(findDiscount("PL")).resolves.toBe("recovered")
    expect(iterDiscountsMock).toHaveBeenCalledTimes(3)
  })

  it("retries when the SDK throws before returning an iterator", async () => {
    iterDiscountsMock
      .mockImplementationOnce(() => {
        throw new Error("SDK validation failed")
      })
      .mockImplementation(() => discountPages([percentageDiscount("recovered", 3000)]))

    await expect(findDiscount("PL")).resolves.toBeUndefined()
    await expect(findDiscount("PL")).resolves.toBe("recovered")
    expect(iterDiscountsMock).toHaveBeenCalledTimes(2)
  })
})
