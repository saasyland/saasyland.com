import type { MutationOptions } from "@tanstack/react-query"
import { getRequest } from "@tanstack/react-start/server"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

import { executeMutation } from "~/src/platform/testing/lib/query"
import { flushWaitUntil } from "~/src/platform/testing/mocks/cloudflare"

import { auth } from "~/src/integrations/better-auth/auth.server"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { changeEmailMutation } from "~/src/modules/account/use-cases/change-email"
import { requestPasswordResetMutation } from "~/src/modules/verification/use-cases/request-password-reset"
import { sendVerificationEmailMutation } from "~/src/modules/verification/use-cases/send-verification-email"

import changeEmailMessages from "~/messages/pl-PL/emails.change-email-confirmation-email.json"
import resetPasswordMessages from "~/messages/pl-PL/emails.reset-password-email.json"
import verifyEmailMessages from "~/messages/pl-PL/emails.verify-email.json"
import { ROUTES } from "~/src/routes"

const ORIGIN = "http://127.0.0.1:3000"
const { host: HOST } = new URL(ORIGIN)
const PASSWORD = "LocalePassword1!"
// Every flow starts on a Polish page while a German page, loaded last in another tab, owns the locale cookie.
const OTHER_TAB_COOKIE = `${I18N.COOKIE_NAME}=de-DE`

const EMAIL_SCHEMA = zod.object({ html: zod.string(), subject: zod.string(), to: zod.string() })
const deliveries: zod.infer<typeof EMAIL_SCHEMA>[] = []

const request = (url: string, { cookie = OTHER_TAB_COOKIE, ...init }: RequestInit & { cookie?: string } = {}) =>
  new Request(url, {
    ...init,
    headers: { "content-type": "application/json", cookie, host: HOST, [IP_ADDRESS_HEADER]: "203.0.113.10", origin: ORIGIN },
  })

const createUser = async ({ emailVerified }: { emailVerified: boolean }): Promise<string> => {
  const context = await auth.$context
  const email = `locale-${crypto.randomUUID()}@example.test`
  const created = await context.internalAdapter.createUser({ email, emailVerified, name: "Ada Lovelace" }, { method: "email" })
  await context.internalAdapter.linkAccount({
    accountId: created.id,
    password: await context.password.hash(PASSWORD),
    providerId: "credential",
    userId: created.id,
  })
  return email
}

const callServerFunction = async <TData, TVariables>(
  mutation: MutationOptions<TData, Error, TVariables>,
  data: TVariables,
  cookie = OTHER_TAB_COOKIE,
) => {
  vi.mocked(getRequest).mockReturnValue(request(`${ORIGIN}/_serverFn/auth`, { cookie, method: "POST" }))
  await executeMutation(mutation, data)
  await flushWaitUntil()
}

beforeEach(() => {
  deliveries.length = 0
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    deliveries.push(EMAIL_SCHEMA.parse(await new Request(input, init).json()))
    return Response.json({ id: crypto.randomUUID() })
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("auth emails follow the page the flow started on, not the locale cookie", () => {
  it("writes the password reset email in the locale of the forgot-password page", async () => {
    const email = await createUser({ emailVerified: true })

    await callServerFunction(requestPasswordResetMutation, { email, redirectTo: `/pl-PL${ROUTES.RESET_PASSWORD}` })

    expect(deliveries).toEqual([expect.objectContaining({ subject: resetPasswordMessages.subject, to: email })])
  })

  it("writes the resent verification email in the locale of the verify-email page", async () => {
    const email = await createUser({ emailVerified: false })

    await callServerFunction(sendVerificationEmailMutation, { callbackURL: `/pl-PL${ROUTES.AUTH_CALLBACK}`, email })

    expect(deliveries).toEqual([expect.objectContaining({ subject: verifyEmailMessages.subject, to: email })])
    expect(deliveries[0]?.html).toContain(`${ORIGIN}/pl-PL${ROUTES.VERIFY_EMAIL}?token=`)
  })

  it("writes both change-email emails in the locale of the page the change started on, even after a link click", async () => {
    const email = await createUser({ emailVerified: true })
    const newEmail = `locale-${crypto.randomUUID()}@example.test`
    const signIn = await auth.handler(
      request(`${ORIGIN}${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.SIGN_IN_EMAIL}`, {
        body: JSON.stringify({ email, password: PASSWORD }),
        method: "POST",
      }),
    )
    const session = signIn.headers
      .getSetCookie()
      .map((cookie) => cookie.split(";")[0])
      .join("; ")

    await callServerFunction(changeEmailMutation, { callbackURL: `/pl-PL${ROUTES.APP}`, newEmail }, `${session}; ${OTHER_TAB_COOKIE}`)

    expect(deliveries).toEqual([expect.objectContaining({ subject: changeEmailMessages.subject, to: email })])
    const confirmUrl = /href="(?<url>[^"]+\/verify-email\?[^"]+)"/u
      .exec(deliveries[0]?.html ?? "")
      ?.groups?.["url"]?.replaceAll("&amp;", "&")
    expect(confirmUrl).toBeDefined()
    deliveries.length = 0
    const click = request(confirmUrl!)
    vi.mocked(getRequest).mockReturnValue(click)

    await auth.handler(click)
    await flushWaitUntil()

    expect(deliveries).toEqual([expect.objectContaining({ subject: verifyEmailMessages.subject, to: newEmail })])
  })
})
