import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { getRequest } from "@tanstack/react-start/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import type { PolarProduct } from "~/src/platform/testing/lib/polar"
import { executeMutation } from "~/src/platform/testing/lib/query"
import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { payPolarCheckout, polarCheckouts, seedPolarCatalogue } from "~/src/platform/testing/mocks/polar"

import { AFFONSO } from "~/src/integrations/affonso/affonso.constants"
import { browserHeaders, createTestAccount, signUpAndVerify } from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { POLAR_CHECKOUT_DEFAULT_LANGUAGE, POLAR_RECURRING_INTERVAL, polarCheckoutOrigin } from "~/src/integrations/polar/polar.constants"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { startCheckoutMutation as startLicenseCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"
import { CHECKOUT_RATE_LIMIT, ORDER_CHECKOUT_METADATA } from "~/src/modules/order/order.constants"
import type { Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"
import { startCheckoutMutation } from "~/src/modules/order/use-cases/start-checkout"

import { ROUTES } from "~/src/routes"

const RETURN_PATH = "/pl-PL/pricing?plan=team"

const STARTER_KIT: PolarProduct = {
  id: "00000000-0000-4000-8000-0000000000a1",
  name: "Starter kit",
  price: { amount: 4900, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: null,
}

const TEAM_PLAN: PolarProduct = {
  id: "00000000-0000-4000-8000-0000000000a2",
  name: "Team plan",
  price: { amount: 1900, currency: DEFAULT_CURRENCY_CODE },
  recurringInterval: POLAR_RECURRING_INTERVAL.MONTH,
}

type Buyer = Awaited<ReturnType<typeof signUpAndVerify>>

const actAs = ({ headers }: Pick<Buyer, "headers">, { cookie, origin = TEST_APP_URL }: { cookie?: string; origin?: string } = {}) => {
  const requestHeaders = new Headers(headers)
  if (cookie !== undefined) {
    requestHeaders.set("cookie", `${requestHeaders.get("cookie") ?? ""}; ${cookie}`)
  }
  vi.mocked(getRequest).mockReturnValue(new Request(`${origin}/_serverFn/order`, { headers: requestHeaders, method: "POST" }))
}

const checkoutInput = (input: Partial<Order["startCheckout"]> = {}): Order["startCheckout"] => ({
  locale: "en-US",
  productId: STARTER_KIT.id,
  returnPath: RETURN_PATH,
  successPath: ROUTES.APP.INDEX,
  ...input,
})

const startCheckout = async (buyer: Buyer, input: Partial<Order["startCheckout"]> = {}): Promise<models.Checkout> => {
  actAs(buyer)
  const { checkoutId, url } = await executeMutation(startCheckoutMutation, checkoutInput(input))
  const checkout = polarCheckouts().find(({ id }) => id === checkoutId)
  if (checkout === undefined) {
    throw new Error(`Polar holds no checkout ${checkoutId}`)
  }
  expect(checkout.url).toBe(url)
  return checkout
}

const checkoutsOf = (buyer: Buyer): models.Checkout[] =>
  polarCheckouts().filter(({ external_customer_id: customer }) => customer === buyer.userId)

beforeEach(() => {
  seedPolarCatalogue({ licenseKeyBenefits: [], products: [STARTER_KIT, TEAM_PLAN] })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("start-checkout", () => {
  it("opens a Polar checkout for the product at its catalogue price, tied to the account, in the buyer's language", async () => {
    const buyer = await signUpAndVerify({ ...createTestAccount(), name: "Grace Hopper" })

    const checkout = await startCheckout(buyer, { locale: "pl-PL" })

    expect(checkout).toMatchObject({
      allow_discount_codes: true,
      custom_field_data: {},
      customer_email: buyer.account.email,
      customer_ip_address: buyer.headers.get(IP_ADDRESS_HEADER),
      customer_name: "Grace Hopper",
      embed_origin: TEST_APP_URL,
      external_customer_id: buyer.userId,
      locale: "pl",
      metadata: { [ORDER_CHECKOUT_METADATA.LOCALE]: "pl-PL" },
      net_amount: STARTER_KIT.price.amount,
      product_id: STARTER_KIT.id,
      return_url: `${TEST_APP_URL}${RETURN_PATH}`,
      success_url: `${TEST_APP_URL}/pl-PL${ROUTES.APP.INDEX}?checkoutId=${checkout.id}`,
    })
    expect(new URL(checkout.url).origin).toBe(polarCheckoutOrigin(env.POLAR_SERVER))
  })

  it("sells a subscription the same way", async () => {
    const buyer = await signUpAndVerify()

    const checkout = await startCheckout(buyer, { productId: TEAM_PLAN.id })

    expect(checkout).toMatchObject({ net_amount: TEAM_PLAN.price.amount, product_id: TEAM_PLAN.id })
  })

  it("comes back to the page the caller names after paying, keeping its own search params after the checkout ID", async () => {
    const buyer = await signUpAndVerify()

    const checkout = await startCheckout(buyer, { successPath: `${ROUTES.APP.INDEX}?plan=team&seats=3` })

    expect(checkout.success_url).toBe(`${TEST_APP_URL}${ROUTES.APP.INDEX}?checkoutId=${checkout.id}&plan=team&seats=3`)
  })

  it.each([
    ["de-DE", "de"],
    ["uk-UA", POLAR_CHECKOUT_DEFAULT_LANGUAGE],
  ] as const)("opens the checkout of a %s buyer in Polar's %s", async (locale, language) => {
    const buyer = await signUpAndVerify()

    const checkout = await startCheckout(buyer, { locale })

    expect(checkout.locale).toBe(language)
  })

  it("passes the affiliate referral to Polar, which keeps it on the paid order with the buyer's language", async () => {
    const buyer = await signUpAndVerify()
    const referral = "cmh7q6ayf0001jz08referral"
    actAs(buyer, { cookie: `${AFFONSO.REFERRAL_COOKIE}=${referral}` })

    const { checkoutId } = await executeMutation(startCheckoutMutation, checkoutInput())

    const metadata = { [AFFONSO.METADATA_KEY]: referral, [ORDER_CHECKOUT_METADATA.LOCALE]: "en-US" }
    expect(payPolarCheckout(checkoutId).metadata).toStrictEqual(metadata)
  })

  it.each(LICENSE_TIERS)("refuses the %s licence, which only the licence checkout sells, without asking Polar", async (tier) => {
    const buyer = await signUpAndVerify()
    actAs(buyer)

    await expect(executeMutation(startCheckoutMutation, checkoutInput({ productId: POLAR_PRODUCT_IDS[tier] }))).rejects.toThrow(
      ERROR_CODES.FORBIDDEN,
    )
    expect(checkoutsOf(buyer)).toStrictEqual([])
  })

  it.each(["http://attacker.example", "http://localhost:3030"])(
    "refuses a checkout requested through %s, a host this build does not serve, without asking Polar",
    async (origin) => {
      const buyer = await signUpAndVerify()
      actAs(buyer, { origin })

      await expect(executeMutation(startCheckoutMutation, checkoutInput())).rejects.toThrow(ERROR_CODES.FORBIDDEN)
      expect(checkoutsOf(buyer)).toStrictEqual([])
    },
  )

  it("refuses a visitor who is not signed in", async () => {
    actAs({ headers: browserHeaders() })

    await expect(executeMutation(startCheckoutMutation, checkoutInput())).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
    expect(polarCheckouts()).toStrictEqual([])
  })

  it("refuses more checkouts from one address in a minute than the limit, counting the licence checkout too", async () => {
    const buyer = await signUpAndVerify()
    actAs(buyer)
    await executeMutation(startLicenseCheckoutMutation, { locale: "en-US", returnPath: RETURN_PATH, tier: LICENSE_TIER.CORE })
    for (let started = 1; started < CHECKOUT_RATE_LIMIT.max; started += 1) {
      await executeMutation(startCheckoutMutation, checkoutInput())
    }

    await expect(executeMutation(startCheckoutMutation, checkoutInput())).rejects.toThrow(ERROR_CODES.TOO_MANY_REQUESTS)
    expect(checkoutsOf(buyer)).toHaveLength(CHECKOUT_RATE_LIMIT.max)
  })

  it.each([
    ["a product ID that is not a UUID", { productId: "starter-kit" }],
    ["a language the site does not speak", { locale: "xx-XX" }],
    ["a back button that leaves the site", { returnPath: "https://evil.example/pricing" }],
    ["a success page that leaves the site", { successPath: "//evil.example/app" }],
    ["a success page without a leading slash", { successPath: "app" }],
  ])("refuses %s", (_case, input) => {
    expect(orderZodSchemas.startCheckout.safeParse({ ...checkoutInput(), ...input }).success).toBe(false)
  })
})
