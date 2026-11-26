import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { describe, expect, it, vi } from "vite-plus/test"

import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import {
  browserHeaders,
  emailLink,
  findUser,
  sessionCookie,
  signUpAndVerify,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.harness"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import { ACCOUNT_EMAIL_PURPOSE } from "~/src/modules/account/account.constants"
import { session } from "~/src/modules/session/session.schema"
import { user } from "~/src/modules/user/user.schema"

import { BREACHED_PASSWORD } from "~/e2e/data/accounts"
import { ROUTES } from "~/src/routes"

const NEW_PASSWORD = "ChangedSecret1!x"

const countryOfSession = async (headers: Headers): Promise<string | null | undefined> => {
  const current = await auth.api.getSession({ headers })
  const [row] = await db
    .select({ country: session.country })
    .from(session)
    .where(eq(session.id, current?.session.id ?? ""))
  return row?.country
}

describe("password change notice", () => {
  it("emails the account in the page's language once the password changed", async () => {
    const { account, headers } = await signUpAndVerify()
    vi.mocked(getRequest).mockReturnValue(
      new Request(`${TEST_APP_URL}/_serverFn/change-password`, {
        headers: { referer: `${TEST_APP_URL}/pl-PL${ROUTES.APP.SETTINGS.INDEX}` },
      }),
    )

    await auth.api.changePassword({
      body: { currentPassword: account.password, newPassword: NEW_PASSWORD, revokeOtherSessions: true },
      headers,
    })
    await flushWaitUntil()

    const notice = getSentEmails(account.email).at(-1)
    expect(notice?.idempotencyKey?.startsWith(`${ACCOUNT_EMAIL_PURPOSE.PASSWORD_CHANGED}/`)).toBe(true)
    expect(notice?.html).toContain('lang="pl-PL"')
  })

  it("sends nothing when the current password is wrong", async () => {
    const { account, headers } = await signUpAndVerify()
    const sent = getSentEmails(account.email).length

    await expect(
      auth.api.changePassword({
        body: { currentPassword: "WrongSecret1!x", newPassword: NEW_PASSWORD, revokeOtherSessions: true },
        headers,
      }),
    ).rejects.toThrow("Invalid password")
    await flushWaitUntil()

    expect(getSentEmails(account.email)).toHaveLength(sent)
  })

  it("keeps the new password when the notice cannot be sent", async () => {
    const { account, headers } = await signUpAndVerify()
    const failure = vi.spyOn(console, "error").mockReturnValue()
    vi.mocked(getRequest).mockImplementation(() => {
      throw new Error("No request")
    })

    await auth.api.changePassword({
      body: { currentPassword: account.password, newPassword: NEW_PASSWORD, revokeOtherSessions: true },
      headers,
    })
    await flushWaitUntil()

    expect(failure).toHaveBeenCalledWith("[email] the password change notice could not be sent", expect.any(Error))
  })
})

describe("set password", () => {
  it("refuses a password found in a known data breach", async () => {
    const { headers } = await signUpAndVerify()

    await expect(
      auth.api.setPassword({ body: { newPassword: BREACHED_PASSWORD.padEnd(NEW_PASSWORD.length, "1") }, headers }),
    ).rejects.toThrow()
  })
})

describe("session location", () => {
  it.each([
    { country: "pl", expected: "PL" },
    { country: "T1", expected: null },
    { country: undefined, expected: null },
  ])("records the country $country that Cloudflare names as $expected", async ({ country, expected }) => {
    const { account } = await signUpAndVerify()
    const headers = browserHeaders()
    if (country !== undefined) {
      headers.set(COUNTRY_HEADER, country)
    }

    const signedIn = await auth.api.signInEmail({
      body: { email: account.email, password: account.password },
      headers,
      returnHeaders: true,
    })

    const signedInBrowser = browserHeaders({ cookie: sessionCookie(signedIn.headers) })

    expect(await countryOfSession(signedInBrowser)).toBe(expected)
  })
})

describe("account deletion", () => {
  it("emails a link to the confirmation page and deletes the account only with its token", async () => {
    const { account, headers } = await signUpAndVerify()

    await auth.api.deleteUser({ body: { callbackURL: `/pl-PL${ROUTES.APP.SETTINGS.DELETE_ACCOUNT}`, password: account.password }, headers })
    await flushWaitUntil()
    const link = emailLink(account.email, ROUTES.APP.SETTINGS.DELETE_ACCOUNT)
    expect(link.pathname).toBe(`/pl-PL${ROUTES.APP.SETTINGS.DELETE_ACCOUNT}`)

    await expect(auth.api.deleteUser({ body: { token: "not-the-token" }, headers })).rejects.toThrow()
    await expect(findUser(account.email)).resolves.toMatchObject({ email: account.email })

    await auth.api.deleteUser({ body: { token: link.searchParams.get("token") ?? "" }, headers })
    expect(await db.select().from(user).where(eq(user.email, account.email))).toStrictEqual([])
  })

  it("asks for the right password before it sends anything", async () => {
    const { account, headers } = await signUpAndVerify()
    const sent = getSentEmails(account.email).length

    await expect(
      auth.api.deleteUser({ body: { callbackURL: ROUTES.APP.SETTINGS.DELETE_ACCOUNT, password: "WrongSecret1!x" }, headers }),
    ).rejects.toThrow("Invalid password")
    await flushWaitUntil()
    expect(getSentEmails(account.email)).toHaveLength(sent)
  })
})

describe("connected accounts", () => {
  it("never disconnects the only way an account signs in", async () => {
    const { headers } = await signUpAndVerify()
    const [credential] = await auth.api.listUserAccounts({ headers })

    await expect(auth.api.unlinkAccount({ body: { accountId: credential?.id ?? "" }, headers })).rejects.toThrow(
      "You can't unlink your last account",
    )
  })
})
