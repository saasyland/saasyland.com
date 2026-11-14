import { describe, expect, it } from "vite-plus/test"

import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"

import { EMAIL_MAX_LENGTH, IMAGE_URL_MAX_LENGTH, NAME_MAX_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { HTTP_STATUS, IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"

import { ROUTES } from "~/src/routes"

const ORIGIN = "http://127.0.0.1:3000"
const STRONG_PASSWORD = "PolicyPassword123!"
const WEAK_PASSWORDS = ["aaaaaaaa", "AAAAAAAA", "Aaaaaaaa", "aaaaaaa!"]
const LONG_NAME = "n".repeat(NAME_MAX_LENGTH + 1)
const LONG_EMAIL = `${"e".repeat(EMAIL_MAX_LENGTH)}@example.test`
const LONG_IMAGE = `https://example.test/${"i".repeat(IMAGE_URL_MAX_LENGTH)}`

let requestCount = 0

const post = async (path: string, body: Record<string, unknown>): Promise<Response> => {
  requestCount += 1
  const response = await auth.handler(
    new Request(`${ORIGIN}${ROUTES.API_AUTH_BASE}${path}`, {
      body: JSON.stringify(body),
      headers: { [IP_ADDRESS_HEADER]: `203.0.113.${requestCount}`, "content-type": "application/json", origin: ORIGIN },
      method: "POST",
    }),
  )
  await flushWaitUntil()
  return response
}

const expectRejected = async (response: Response): Promise<void> => {
  expect(response.status).toBe(HTTP_STATUS.BAD_REQUEST)
  expect(await response.json()).toMatchObject({ code: "VALIDATION_ERROR" })
}

const signUpBody = (overrides: Record<string, unknown> = {}) => ({
  email: `policy-${crypto.randomUUID()}@example.test`,
  name: "Policy Tester",
  password: STRONG_PASSWORD,
  ...overrides,
})

describe("auth input policy on Better Auth's own endpoints", () => {
  it.each(WEAK_PASSWORDS)("rejects a sign-up posted straight to Better Auth with the weak password %s", async (password) => {
    await expectRejected(await post(ROUTES.API_AUTH.SIGN_UP_EMAIL, signUpBody({ password })))
  })

  it.each([
    { field: "name", value: LONG_NAME },
    { field: "email", value: LONG_EMAIL },
    { field: "image", value: LONG_IMAGE },
  ])("rejects a sign-up whose $field is longer than the forms allow", async ({ field, value }) => {
    await expectRejected(await post(ROUTES.API_AUTH.SIGN_UP_EMAIL, signUpBody({ [field]: value })))
  })

  it("lets a sign-up that meets the policy through to Better Auth", async () => {
    const response = await post(ROUTES.API_AUTH.SIGN_UP_EMAIL, signUpBody())

    expect(response.status).toBe(HTTP_STATUS.OK)
  })

  it.each([
    { body: { newPassword: "aaaaaaaa", token: "any-token" }, path: ROUTES.API_AUTH.RESET_PASSWORD },
    { body: { currentPassword: STRONG_PASSWORD, newPassword: "aaaaaaaa" }, path: ROUTES.API_AUTH.CHANGE_PASSWORD },
    { body: { name: LONG_NAME }, path: ROUTES.API_AUTH.UPDATE_USER },
    { body: { image: LONG_IMAGE }, path: ROUTES.API_AUTH.UPDATE_USER },
    { body: { newEmail: "not-an-email" }, path: ROUTES.API_AUTH.CHANGE_EMAIL },
    { body: { email: "admin-made@example.test", name: "Made", password: "aaaaaaaa" }, path: ROUTES.API_AUTH.ADMIN_CREATE_USER },
    { body: { newPassword: "aaaaaaaa", userId: "any-user" }, path: ROUTES.API_AUTH.ADMIN_SET_USER_PASSWORD },
    { body: { data: { name: LONG_NAME }, userId: "any-user" }, path: ROUTES.API_AUTH.ADMIN_UPDATE_USER },
  ])("rejects $path with input the forms would refuse, before Better Auth runs it", async ({ body, path }) => {
    await expectRejected(await post(path, body))
  })

  it("leaves endpoints without a policy, such as sign-in, to Better Auth", async () => {
    const response = await post(ROUTES.API_AUTH.SIGN_IN_EMAIL, { email: "nobody@example.test", password: "x" })

    expect(response.status).toBe(HTTP_STATUS.UNAUTHORIZED)
  })
})
