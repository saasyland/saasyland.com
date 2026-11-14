import { eq } from "drizzle-orm"
import * as zod from "zod"

import { TEST_APP_URL } from "~/src/platform/testing/lib/test-request"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { user } from "~/src/modules/user/user.schema"

import { ROUTES } from "~/src/routes"

export const AUTH_TEST_PASSWORD = "Secret1!"

const OCTET = 256
const LINK = /href="(?<href>[^"]+)"/gu
const tokenSchema = zod.string().min(1)

let clients = 0

export interface TestAccount {
  readonly email: string
  readonly name: string
  readonly password: string
}

export const createTestAccount = (): TestAccount => ({
  email: `user-${crypto.randomUUID()}@example.test`,
  name: "Test User",
  password: AUTH_TEST_PASSWORD,
})

export const nextClientAddress = (): string => {
  clients += 1
  return `198.18.${String(Math.floor(clients / OCTET))}.${String(clients % OCTET)}`
}

interface Browser {
  readonly cookie?: string
  readonly ip?: string
}

export const browserHeaders = ({ cookie = "", ip = nextClientAddress() }: Browser = {}): Headers =>
  new Headers({ [IP_ADDRESS_HEADER]: ip, cookie, host: new URL(TEST_APP_URL).host, origin: TEST_APP_URL })

export const sessionCookie = (response: Headers): string =>
  response
    .getSetCookie()
    .map((cookie) => cookie.split(";", 1).join(""))
    .join("; ")

export const browserRequest = (pathname: string, init: RequestInit = {}): Request =>
  new Request(new URL(pathname, TEST_APP_URL), { headers: browserHeaders(), ...init })

export const postJson = (pathname: string, body: Record<string, unknown>, browser: Browser = {}): Request => {
  const headers = browserHeaders(browser)
  headers.set("content-type", "application/json")
  return browserRequest(pathname, { body: JSON.stringify(body), headers, method: "POST" })
}

export const emailLink = (recipient: string, path: string): URL => {
  const html = getSentEmails(recipient).at(-1)?.html ?? ""
  const href = [...html.matchAll(LINK)]
    .map(({ groups }) => groups?.["href"]?.replaceAll("&amp;", "&") ?? "")
    .find((link) => link.includes(path))
  if (href === undefined) {
    throw new Error(`No email to ${recipient} links to ${path}`)
  }
  return new URL(href)
}

export const emailToken = (recipient: string, path: string): string =>
  tokenSchema.parse(emailLink(recipient, path).searchParams.get("token"))

export const signUp = async (account: TestAccount = createTestAccount()): Promise<TestAccount> => {
  await auth.api.signUpEmail({ body: account, headers: browserHeaders() })
  await flushWaitUntil()
  return account
}

export const verifyEmail = async (recipient: string): Promise<Headers> => {
  const { headers } = await auth.api.verifyEmail({
    headers: browserHeaders(),
    query: { token: emailToken(recipient, ROUTES.VERIFY_EMAIL) },
    returnHeaders: true,
  })
  await flushWaitUntil()
  return browserHeaders({ cookie: sessionCookie(headers) })
}

export const signIn = async ({ email, password }: Pick<TestAccount, "email" | "password">): Promise<Headers> => {
  const { headers } = await auth.api.signInEmail({ body: { email, password }, headers: browserHeaders(), returnHeaders: true })
  return browserHeaders({ cookie: sessionCookie(headers) })
}

export const findUser = async (email: string) => {
  const [row] = await db.select().from(user).where(eq(user.email, email))
  if (row === undefined) {
    throw new Error(`No user has the email ${email}`)
  }
  return row
}

export const signUpAndVerify = async (account: TestAccount = createTestAccount()) => {
  await signUp(account)
  const headers = await verifyEmail(account.email)
  const { id } = await findUser(account.email)
  return { account, headers, userId: id }
}

export const promoteToAdmin = async (userId: string): Promise<void> => {
  await db.update(user).set({ role: ROLE_CODES.ADMIN }).where(eq(user.id, userId))
}
