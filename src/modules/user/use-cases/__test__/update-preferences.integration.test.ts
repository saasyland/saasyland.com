import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"
import { TEST_APP_URL, createTestRequestUrl } from "~/src/platform/testing/lib/test-request"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { updatePreferencesMutation } from "~/src/modules/user/use-cases/update-preferences"
import { user } from "~/src/modules/user/user.schema"

import { ROUTES } from "~/src/routes"

const PASSWORD = "PreferencesPassword1!"
const CHOSEN_TIMEZONE = "Asia/Tokyo"
const { host: HOST } = new URL(TEST_APP_URL)

const request = vi.hoisted(() => ({ headers: new Headers() }))

vi.mock(import("@tanstack/react-start/server"), async (importOriginal) => ({
  ...(await importOriginal()),
  getRequest: () => new Request(TEST_APP_URL, { headers: request.headers }),
}))

const signIn = async (): Promise<string> => {
  const context = await auth.$context
  const email = `preferences-${crypto.randomUUID()}@example.test`
  const created = await context.internalAdapter.createUser({ email, emailVerified: true, name: "Preferences Tester" }, { method: "email" })
  await context.internalAdapter.linkAccount({
    accountId: created.id,
    password: await context.password.hash(PASSWORD),
    providerId: AUTH_PROVIDER.CREDENTIAL,
    userId: created.id,
  })
  const response = await auth.handler(
    new Request(createTestRequestUrl(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_IN_EMAIL}`), {
      body: JSON.stringify({ email, password: PASSWORD }),
      headers: { [IP_ADDRESS_HEADER]: "203.0.113.20", "content-type": "application/json", origin: TEST_APP_URL },
      method: "POST",
    }),
  )
  request.headers = new Headers({
    cookie: response.headers
      .getSetCookie()
      .map((entry) => entry.split(";")[0])
      .join("; "),
    host: HOST,
  })
  return created.id
}

const storedTimezone = async (userId: string) => {
  const [row] = await db.select({ timezone: user.timezone }).from(user).where(eq(user.id, userId))
  return row?.timezone
}

beforeEach(() => {
  request.headers = new Headers({ host: HOST })
})

describe("updatePreferences", () => {
  it("stores the signed-in user's time zone in D1 and returns it on their session", async () => {
    const userId = await signIn()

    await expect(executeMutation(updatePreferencesMutation, { timezone: CHOSEN_TIMEZONE })).resolves.toStrictEqual({ status: true })

    await expect(storedTimezone(userId)).resolves.toBe(CHOSEN_TIMEZONE)
    await expect(auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } })).resolves.toMatchObject({
      user: { id: userId, timezone: CHOSEN_TIMEZONE },
    })
  })

  it("starts every account on the default time zone", async () => {
    const userId = await signIn()

    await expect(storedTimezone(userId)).resolves.toBe(I18N.DEFAULT_TIMEZONE)
  })

  it("refuses a visitor who is not signed in", async () => {
    await expect(executeMutation(updatePreferencesMutation, { timezone: CHOSEN_TIMEZONE })).rejects.toThrow(ERROR_CODES.UNAUTHORIZED)
  })
})
