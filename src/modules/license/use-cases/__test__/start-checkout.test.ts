import type * as StartServerModule from "@tanstack/react-start/server"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { executeMutation } from "~/src/platform/testing/lib/query"

import { AFFONSO } from "~/src/integrations/affonso/affonso.constants"
import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import type { auth } from "~/src/integrations/better-auth/auth.server"
import * as authServer from "~/src/integrations/better-auth/auth.server"
import { POLAR_CHECKOUT_ID_PLACEHOLDER, POLAR_PRODUCT_IDS } from "~/src/integrations/polar/polar.constants"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import * as ppp from "~/src/modules/license/license.ppp"
import type { License } from "~/src/modules/license/license.types"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"
import * as licenses from "~/src/modules/license/use-cases/get-license"
import { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"

const HEADERS = new Headers()
const REFERRAL_ID = "cmh7q6ayf0001jz08referral"
const REFERRAL_HEADERS = new Headers({ cookie: `${AFFONSO.REFERRAL_COOKIE}=${REFERRAL_ID}` })
const USER_ID = "01900000-0000-7000-8000-000000000009"
const CHECKOUT_URL = "https://sandbox.polar.sh/checkout/abc"
const SUCCESS_PATH = `/app?checkoutId=${POLAR_CHECKOUT_ID_PLACEHOLDER}`

type AuthApi = typeof auth.api

const getSessionMock = vi.hoisted(() => vi.fn<AuthApi["getSession"]>())
const checkoutMock = vi.hoisted(() => vi.fn<AuthApi["checkout"]>())
const request = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request("http://127.0.0.1:3000/", { headers: request.headers })),
}))

const ownedLicense = (status: License["select"]["status"]): License["select"] => ({
  createdAt: new Date("2026-09-24T10:00:00Z"),
  id: "owned",
  key: "key",
  polarCustomerId: "customer",
  polarLicenseKeyId: "polar-license",
  polarOrderId: "order",
  purchaseCreatedAt: new Date("2026-09-24T10:00:00Z"),
  status,
  tier: LICENSE_TIER.CORE,
  updatedAt: new Date("2026-09-24T10:00:00Z"),
  userId: USER_ID,
})

const signedIn = (license?: License["select"]) => {
  getSessionMock.mockReset()
  checkoutMock.mockReset()
  vi.spyOn(authServer.auth.api, "getSession").mockImplementation(getSessionMock)
  vi.spyOn(authServer.auth.api, "checkout").mockImplementation(checkoutMock)
  getSessionMock.mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId: USER_ID }))
  checkoutMock.mockResolvedValue({ redirect: true, url: CHECKOUT_URL })
  return vi.spyOn(licenses, "getLicense").mockResolvedValue(license)
}

afterEach(() => {
  request.headers = HEADERS
  vi.restoreAllMocks()
})

describe("start-checkout", () => {
  it("applies the server-resolved regional discount to the requested Agency checkout", async () => {
    signedIn()
    const discount = vi.spyOn(ppp, "pppDiscountId").mockResolvedValue("regional-discount-30")

    await expect(executeMutation(startCheckoutMutation, { locale: "en-US", tier: LICENSE_TIER.AGENCY })).resolves.toEqual({
      url: CHECKOUT_URL,
    })

    expect(discount).toHaveBeenCalledExactlyOnceWith(HEADERS, POLAR_PRODUCT_IDS[LICENSE_TIER.AGENCY])
    expect(checkoutMock).toHaveBeenCalledWith({
      body: {
        allow_discount_codes: false,
        discount_id: "regional-discount-30",
        metadata: {},
        slug: LICENSE_TIER.AGENCY,
        success_url: SUCCESS_PATH,
      },
      headers: HEADERS,
    })
  })

  it("returns the buyer to the app in the language they bought in, with the checkout id", async () => {
    expect.hasAssertions()
    const lookup = signedIn()

    await expect(executeMutation(startCheckoutMutation, { locale: "pl-PL", tier: LICENSE_TIER.COMPLETE })).resolves.toMatchObject({
      url: CHECKOUT_URL,
    })

    expect(lookup).toHaveBeenCalledExactlyOnceWith(USER_ID)
    expect(checkoutMock).toHaveBeenCalledWith({
      body: { allow_discount_codes: false, metadata: {}, slug: LICENSE_TIER.COMPLETE, success_url: `/pl-PL${SUCCESS_PATH}` },
      headers: HEADERS,
    })
  })

  it("credits the affiliate whose referral the buyer carries, next to the regional discount", async () => {
    expect.hasAssertions()
    signedIn()
    request.headers = REFERRAL_HEADERS
    vi.spyOn(ppp, "pppDiscountId").mockResolvedValue("regional-discount-30")

    await executeMutation(startCheckoutMutation, { locale: "en-US", tier: LICENSE_TIER.COMPLETE })

    expect(checkoutMock).toHaveBeenCalledWith({
      body: {
        allow_discount_codes: false,
        discount_id: "regional-discount-30",
        metadata: { [AFFONSO.METADATA_KEY]: REFERRAL_ID },
        slug: LICENSE_TIER.COMPLETE,
        success_url: SUCCESS_PATH,
      },
      headers: REFERRAL_HEADERS,
    })
  })

  it("refuses a second checkout while the account holds an active license", async () => {
    expect.hasAssertions()
    signedIn(ownedLicense(LICENSE_STATUS.ACTIVE))
    const discount = vi.spyOn(ppp, "pppDiscountId")

    await expect(executeMutation(startCheckoutMutation, { locale: "en-US", tier: LICENSE_TIER.AGENCY })).rejects.toThrow(
      ERROR_CODES.LICENSE_ALREADY_ACTIVE,
    )

    expect(discount).not.toHaveBeenCalled()
    expect(checkoutMock).not.toHaveBeenCalled()
  })

  it("lets an account whose license was refunded buy again", async () => {
    expect.hasAssertions()
    signedIn(ownedLicense(LICENSE_STATUS.REVOKED))

    await expect(executeMutation(startCheckoutMutation, { locale: "en-US", tier: LICENSE_TIER.CORE })).resolves.toEqual({
      url: CHECKOUT_URL,
    })

    expect(checkoutMock).toHaveBeenCalledOnce()
  })

  it("refuses a tier this app does not sell and a language it does not speak", () => {
    expect.hasAssertions()
    signedIn()

    expect(licenseZodSchemas.startCheckout.safeParse({ locale: "en-US", tier: "enterprise" }).success).toBe(false)
    expect(licenseZodSchemas.startCheckout.safeParse({ locale: "xx-XX", tier: LICENSE_TIER.CORE }).success).toBe(false)
    expect(checkoutMock).not.toHaveBeenCalled()
  })

  it("refuses a caller with no session", async () => {
    expect.hasAssertions()
    signedIn()
    getSessionMock.mockResolvedValue(JSON_NULL)

    await expect(executeMutation(startCheckoutMutation, { locale: "en-US", tier: LICENSE_TIER.CORE })).rejects.toThrow(
      ERROR_CODES.UNAUTHORIZED,
    )
  })
})
