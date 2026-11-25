import { type APIRequestContext, type Page, request as requests } from "@playwright/test"
import * as zod from "zod"

import { IP_ADDRESS_HEADER } from "../../src/modules/_core/constants/api"
import * as ROUTES from "../../src/routes"
import { APP_NAVIGATION_WAIT_UNTIL } from "../pages/base-page"
import { expectVerificationEmail } from "./emails"
import { expect } from "./test"

export const BUYER_NAME = "Test Buyer"
export const BUYER_PASSWORD = "StrongPassword123!"

const signedUpSchema = zod.object({ user: zod.object({ id: zod.string() }) })

export interface Buyer {
  readonly email: string
  readonly userId: string
}

export const ownAddress = (): string => `2001:db8:${crypto.randomUUID().slice(0, 4)}::`

const signUp = async (request: APIRequestContext, baseURL: string | undefined): Promise<Buyer> => {
  const email = `buyer.${crypto.randomUUID()}@example.test`
  const response = await request.post(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_UP_EMAIL}`, {
    data: { email, name: BUYER_NAME, password: BUYER_PASSWORD },
    headers: { [IP_ADDRESS_HEADER]: ownAddress(), origin: String(baseURL) },
  })
  expect(response.ok()).toBe(true)

  return { email, userId: signedUpSchema.parse(await response.json()).user.id }
}

export const signUpBuyer = async (baseURL: string | undefined): Promise<Buyer> => {
  const request = await requests.newContext({ baseURL: String(baseURL) })

  try {
    return await signUp(request, baseURL)
  } finally {
    await request.dispose()
  }
}

export const signUpVerifiedBuyer = async (page: Page, request: APIRequestContext, baseURL: string | undefined): Promise<Buyer> => {
  await page.setExtraHTTPHeaders({ [IP_ADDRESS_HEADER]: ownAddress() })
  const buyer = await signUp(page.request, baseURL)
  await page.goto((await expectVerificationEmail(request, buyer.email)).toString(), { waitUntil: APP_NAVIGATION_WAIT_UNTIL })

  return buyer
}
