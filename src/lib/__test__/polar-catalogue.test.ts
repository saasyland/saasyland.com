import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { PolarProduct } from "~/src/platform/testing/lib/polar"
import { executeQuery } from "~/src/platform/testing/lib/query"
import { revokePolarScope, seedPolarCatalogue } from "~/src/platform/testing/mocks/polar"
import { takeProviderRefusals } from "~/src/platform/testing/mocks/providers"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import {
  POLAR_BENEFIT_TYPE,
  POLAR_DASHBOARD_HOSTS,
  POLAR_ORGANIZATION_SLUG,
  POLAR_PAGE_SIZE,
  POLAR_PRICE_TYPE,
  POLAR_PRODUCT_STATUS,
  POLAR_PRODUCT_VISIBILITY,
  POLAR_RECURRING_INTERVAL,
  POLAR_SCOPE,
} from "~/src/integrations/polar/polar.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { POLAR_READ } from "~/src/modules/order/order.constants"

import { polarProductsQuery } from "~/src/lib/polar-catalogue"

const ADMIN_ID = "01900000-0000-7000-8000-000000000061"
const CREATED_AT = "2026-11-01T00:00:00.000Z"

const price = (productId: string, id: string) => ({
  created_at: CREATED_AT,
  id,
  is_archived: false,
  modified_at: null,
  price_currency: "usd",
  product_id: productId,
  source: "catalog" as const,
  tax_behavior: null,
})

const KIT: PolarProduct = {
  benefits: [
    {
      created_at: CREATED_AT,
      deletable: true,
      description: "Private Discord channel",
      id: "benefit-kit-discord",
      is_deleted: false,
      metadata: {},
      modified_at: null,
      organization_id: "organization",
      properties: { note: null },
      selectable: true,
      type: POLAR_BENEFIT_TYPE.CUSTOM,
      visibility: "public",
      visibility_configurable: false,
    },
  ],
  description: "Every module of the kit",
  id: "00000000-0000-4000-8000-0000000000f1",
  name: "Catalogue kit",
  price: { amount: 4900, currency: "usd" },
  prices: [
    { ...price("00000000-0000-4000-8000-0000000000f1", "price-kit"), amount_type: POLAR_PRICE_TYPE.FIXED, price_amount: 4900 },
    {
      ...price("00000000-0000-4000-8000-0000000000f1", "price-kit-euro"),
      amount_type: POLAR_PRICE_TYPE.FIXED,
      price_amount: 4500,
      price_currency: "eur",
    },
    {
      ...price("00000000-0000-4000-8000-0000000000f1", "price-kit-old"),
      amount_type: POLAR_PRICE_TYPE.FIXED,
      is_archived: true,
      price_amount: 3900,
    },
  ],
  recurringInterval: null,
}

const PLAN: PolarProduct = {
  description: "   ",
  id: "00000000-0000-4000-8000-0000000000f2",
  name: "Catalogue plan",
  price: { amount: 1900, currency: "usd" },
  recurringInterval: POLAR_RECURRING_INTERVAL.MONTH,
  visibility: POLAR_PRODUCT_VISIBILITY.PRIVATE,
}

const TIP: PolarProduct = {
  id: "00000000-0000-4000-8000-0000000000f3",
  name: "Catalogue tip",
  price: { amount: 500, currency: "usd" },
  prices: [
    {
      ...price("00000000-0000-4000-8000-0000000000f3", "price-tip"),
      amount_type: POLAR_PRICE_TYPE.CUSTOM,
      maximum_amount: null,
      minimum_amount: 500,
      preset_amount: null,
    },
  ],
  recurringInterval: null,
  visibility: POLAR_PRODUCT_VISIBILITY.DRAFT,
}

const SEATS: PolarProduct = {
  id: "00000000-0000-4000-8000-0000000000f4",
  isArchived: true,
  name: "Catalogue seats",
  price: { amount: 900, currency: "usd" },
  prices: [
    {
      ...price("00000000-0000-4000-8000-0000000000f4", "price-seats"),
      amount_type: POLAR_PRICE_TYPE.SEAT_BASED,
      seat_tiers: { maximum_seats: null, minimum_seats: 1, tiers: [{ min_seats: 1, price_per_seat: 900 }] },
    } satisfies models.ProductPriceSeatBased,
  ],
  recurringInterval: POLAR_RECURRING_INTERVAL.YEAR,
}

const SEEDED = [KIT, PLAN, TIP, SEATS]

const dashboardUrl = (productId: string): string =>
  `https://${POLAR_DASHBOARD_HOSTS[env.POLAR_SERVER]}/dashboard/${POLAR_ORGANIZATION_SLUG}/products/${productId}`

const seededProducts = async (ids: readonly string[]) => {
  const { products, read } = await executeQuery(polarProductsQuery)

  return { products: products.filter(({ id }) => ids.includes(id)), read }
}

beforeEach(() => {
  seedPolarCatalogue({
    licenseKeyBenefits: [
      { activationLimit: 3, id: "benefit-kit", prefix: "KIT", products: [KIT] },
      { activationLimit: null, id: "benefit-plan", prefix: "PLAN", products: [PLAN] },
    ],
    products: SEEDED,
  })
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN, userId: ADMIN_ID }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("polar-catalogue", () => {
  it("lists every product of the organisation by name, with its current prices, licence keys and no other benefit, billing period, status and Polar page", async () => {
    await expect(seededProducts(SEEDED.map(({ id }) => id))).resolves.toStrictEqual({
      products: [
        {
          description: "Every module of the kit",
          id: KIT.id,
          licenseKeys: [{ activations: 3, id: "benefit-kit" }],
          name: KIT.name,
          polarUrl: dashboardUrl(KIT.id),
          prices: [
            { amountType: POLAR_PRICE_TYPE.FIXED, id: "price-kit", money: { amount: 49, currency: "USD" } },
            { amountType: POLAR_PRICE_TYPE.FIXED, id: "price-kit-euro", money: { amount: 45, currency: "EUR" } },
          ],
          recurrence: undefined,
          status: POLAR_PRODUCT_STATUS.PUBLIC,
        },
        {
          description: undefined,
          id: PLAN.id,
          licenseKeys: [{ activations: undefined, id: "benefit-plan" }],
          name: PLAN.name,
          polarUrl: dashboardUrl(PLAN.id),
          prices: [{ amountType: POLAR_PRICE_TYPE.FIXED, id: `${PLAN.id}-price`, money: { amount: 19, currency: "USD" } }],
          recurrence: { count: 1, interval: POLAR_RECURRING_INTERVAL.MONTH },
          status: POLAR_PRODUCT_STATUS.PRIVATE,
        },
        {
          description: undefined,
          id: SEATS.id,
          licenseKeys: [],
          name: SEATS.name,
          polarUrl: dashboardUrl(SEATS.id),
          prices: [{ amountType: POLAR_PRICE_TYPE.SEAT_BASED, currency: "USD", id: "price-seats" }],
          recurrence: { count: 1, interval: POLAR_RECURRING_INTERVAL.YEAR },
          status: POLAR_PRODUCT_STATUS.ARCHIVED,
        },
        {
          description: undefined,
          id: TIP.id,
          licenseKeys: [],
          name: TIP.name,
          polarUrl: dashboardUrl(TIP.id),
          prices: [{ amountType: POLAR_PRICE_TYPE.CUSTOM, id: "price-tip", money: { amount: 5, currency: "USD" } }],
          recurrence: undefined,
          status: POLAR_PRODUCT_STATUS.DRAFT,
        },
      ],
      read: POLAR_READ.AVAILABLE,
    })
  })

  it("reads every page Polar answers with", async () => {
    const many = Array.from({ length: POLAR_PAGE_SIZE + 1 }, (_, index) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
      name: `Bulk ${String(index).padStart(3, "0")}`,
      price: { amount: 1000, currency: "usd" },
      recurringInterval: null,
    }))
    seedPolarCatalogue({ licenseKeyBenefits: [], products: many })

    const { products } = await seededProducts(many.map(({ id }) => id))

    expect(products.map(({ name }) => name)).toStrictEqual(many.map(({ name }) => name))
  })

  it("says Polar is unavailable, and logs why, when the token cannot read the products", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    revokePolarScope(POLAR_SCOPE.PRODUCTS)

    await expect(executeQuery(polarProductsQuery)).resolves.toStrictEqual({ products: [], read: POLAR_READ.UNAVAILABLE })
    expect(takeProviderRefusals()).toStrictEqual([expect.stringContaining(`the token lacks the ${POLAR_SCOPE.PRODUCTS} scope`)])
    expect(log).toHaveBeenCalledWith("[polar] the product catalogue could not be read", expect.any(Error))
  })

  it("rejects a caller without the permission to read products", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: ADMIN_ID }))

    await expect(executeQuery(polarProductsQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects a signed-out caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(executeQuery(polarProductsQuery)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
