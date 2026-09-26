import { eq } from "drizzle-orm"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_APP_URL, createTestRequestUrl } from "~/src/platform/testing/lib/test-request"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"

import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { user } from "~/src/modules/user/user.schema"

import { ROUTES } from "~/src/routes"

const { host: HOST } = new URL(TEST_APP_URL)
const PASSWORD = "TimezonePassword1!"
const INVALID_TIMEZONE = "Mars/Olympus_Mons"
const VALID_TIMEZONE = "Europe/Warsaw"

const postAuth = (path: string, body: Record<string, unknown>, cookie = ""): Promise<Response> =>
  auth.handler(
    new Request(createTestRequestUrl(`${ROUTES.API_AUTH_BASE}${path}`), {
      body: JSON.stringify(body),
      headers: { "content-type": "application/json", cookie, [IP_ADDRESS_HEADER]: "203.0.113.10", origin: TEST_APP_URL },
      method: "POST",
    }),
  )

const createSignedInUser = async (): Promise<{ cookie: string; userId: string }> => {
  const context = await auth.$context
  const email = `timezone-${crypto.randomUUID()}@example.test`
  const created = await context.internalAdapter.createUser({ email, emailVerified: true, name: "Timezone Tester" }, { method: "email" })
  await context.internalAdapter.linkAccount({
    accountId: created.id,
    password: await context.password.hash(PASSWORD),
    providerId: "credential",
    userId: created.id,
  })
  const response = await postAuth(ROUTES.API_AUTH.SIGN_IN_EMAIL, { email, password: PASSWORD })
  expect(response.status).toBe(200)
  const cookie = response.headers
    .getSetCookie()
    .map((entry) => entry.split(";")[0])
    .join("; ")
  return { cookie, userId: created.id }
}

const stubEmailDelivery = () =>
  vi.spyOn(globalThis, "fetch").mockImplementation(() => Promise.resolve(Response.json({ id: crypto.randomUUID() })))

const signUp = async (body: Record<string, unknown>): Promise<Record<string, unknown>> => {
  const response = await postAuth(ROUTES.API_AUTH.SIGN_UP_EMAIL, { name: "Timezone Tester", password: PASSWORD, ...body })
  await flushWaitUntil()
  expect(response.status).toBe(200)
  const { user: created } = await response.json<{ user: Record<string, unknown> }>()
  return created
}

const readTimezone = async (userId: string): Promise<string | undefined> => {
  const [row] = await db.select({ timezone: user.timezone }).from(user).where(eq(user.id, userId))
  return row?.timezone
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("validated user timezone", () => {
  it("rejects an unknown timezone over HTTP without touching the stored value", async () => {
    const { cookie, userId } = await createSignedInUser()

    const response = await postAuth(ROUTES.API_AUTH.UPDATE_USER, { timezone: INVALID_TIMEZONE }, cookie)

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(readTimezone(userId)).resolves.toBe(I18N.DEFAULT_TIMEZONE)
  })

  it("rejects a null timezone through the server API", async () => {
    const { cookie, userId } = await createSignedInUser()

    await expect(auth.api.updateUser({ body: { timezone: null }, headers: new Headers({ cookie, host: HOST }) })).rejects.toMatchObject({
      body: { code: "VALIDATION_ERROR" },
      statusCode: 400,
    })
    await expect(readTimezone(userId)).resolves.toBe(I18N.DEFAULT_TIMEZONE)
  })

  it("rejects an unknown timezone at sign-up before creating the account", async () => {
    const email = `timezone-${crypto.randomUUID()}@example.test`

    const response = await postAuth(ROUTES.API_AUTH.SIGN_UP_EMAIL, {
      email,
      name: "Timezone Tester",
      password: PASSWORD,
      timezone: INVALID_TIMEZONE,
    })

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ code: "VALIDATION_ERROR" })
    await expect(db.select().from(user).where(eq(user.email, email))).resolves.toHaveLength(0)
  })

  it("stores a supported timezone and returns it on the session", async () => {
    const { cookie, userId } = await createSignedInUser()
    const headers = new Headers({ cookie, host: HOST })

    await expect(auth.api.updateUser({ body: { timezone: VALID_TIMEZONE }, headers })).resolves.toEqual({ status: true })

    await expect(readTimezone(userId)).resolves.toBe(VALID_TIMEZONE)
    const session = await auth.api.getSession({ headers, query: { disableCookieCache: true } })
    expect(session?.user.timezone).toBe(VALID_TIMEZONE)
  })

  it("defaults the timezone at sign-up, so a repeated sign-up returns the same account shape", async () => {
    stubEmailDelivery()
    const email = `timezone-${crypto.randomUUID()}@example.test`

    const created = await signUp({ email })
    const repeated = await signUp({ email })

    expect(created["timezone"]).toBe(I18N.DEFAULT_TIMEZONE)
    expect(repeated["timezone"]).toBe(I18N.DEFAULT_TIMEZONE)
    expect(Object.keys(repeated).toSorted()).toEqual(Object.keys(created).toSorted())
  })

  it("stores a supported timezone chosen at sign-up", async () => {
    stubEmailDelivery()

    const created = await signUp({ email: `timezone-${crypto.randomUUID()}@example.test`, timezone: VALID_TIMEZONE })

    expect(created["timezone"]).toBe(VALID_TIMEZONE)
    await expect(readTimezone(String(created["id"]))).resolves.toBe(VALID_TIMEZONE)
  })
})
