import type { APIRequestContext } from "@playwright/test"
import * as zod from "zod"

import { EMAIL_PURPOSE } from "../../src/integrations/resend/resend.constants"
import { APP_NAME } from "../../src/presentation/branding"
import { expect } from "./test"

const sentEmailsSchema = zod.array(
  zod.object({
    from: zod.string(),
    html: zod.string(),
    id: zod.string(),
    idempotencyKey: zod.string(),
    subject: zod.string(),
    to: zod.array(zod.string()),
  }),
)

const getSentEmails = async (request: APIRequestContext, recipient: string): Promise<zod.infer<typeof sentEmailsSchema>> => {
  const response = await request.get("/__test/emails", { params: { to: recipient } })
  expect(response.ok()).toBe(true)
  return sentEmailsSchema.parse(await response.json())
}

const emailsFor = async (request: APIRequestContext, recipient: string, purpose: string): Promise<zod.infer<typeof sentEmailsSchema>> =>
  (await getSentEmails(request, recipient)).filter(({ idempotencyKey }) => idempotencyKey.startsWith(`${purpose}/`))

export const expectVerificationEmail = async (
  request: APIRequestContext,
  recipient: string,
  expectedCount = 1,
): Promise<URL> => {
  await expect.poll(async () => (await emailsFor(request, recipient, EMAIL_PURPOSE.VERIFY_EMAIL)).length).toBe(expectedCount)

  const emails = await emailsFor(request, recipient, EMAIL_PURPOSE.VERIFY_EMAIL)
  const email = emails.at(-1)
  if (!email) throw new Error(`No verification email was sent to ${recipient}`)

  expect(email.subject).toBe("Verify your email address")
  expect(email.to).toEqual([recipient])
  expect(email.html).toContain('lang="en-US"')
  const verificationLink = email.html.match(/href="([^"]*\/auth\/verify-email\?[^"]*token=[^"]+)"/u)?.[1]
  if (!verificationLink) throw new Error("The verification email has no account verification link")

  const verificationUrl = new URL(verificationLink.replaceAll("&amp;", "&"))
  expect(verificationUrl.searchParams.get("token")).toBeTruthy()
  expect(email.idempotencyKey).toMatch(new RegExp(`^${EMAIL_PURPOSE.VERIFY_EMAIL}/[0-9a-f]{64}$`, "u"))
  return verificationUrl
}

const latestEmail = async (request: APIRequestContext, recipient: string, purpose: string, expectedCount: number) => {
  await expect.poll(async () => (await emailsFor(request, recipient, purpose)).length).toBe(expectedCount)

  const email = (await emailsFor(request, recipient, purpose)).at(-1)
  if (!email) throw new Error(`No ${purpose} email was sent to ${recipient}`)

  expect(email.to).toEqual([recipient])
  return email
}

const linkTo = (html: string, path: string): URL => {
  const link = [...html.matchAll(/href="([^"]+)"/gu)].map(([, href]) => href ?? "").find((href) => new URL(href.replaceAll("&amp;", "&")).pathname.includes(path))
  if (link === undefined) throw new Error(`The email has no link to ${path}`)

  return new URL(link.replaceAll("&amp;", "&"))
}

export const expectExistingAccountEmail = async (
  request: APIRequestContext,
  recipient: string,
  expectedCount = 1,
): Promise<{ resetPasswordUrl: URL; signInUrl: URL }> => {
  const email = await latestEmail(request, recipient, EMAIL_PURPOSE.EXISTING_ACCOUNT, expectedCount)

  expect(email.subject).toBe(`You already have a ${APP_NAME} account`)
  expect(email.html).toContain('lang="en-US"')
  expect(email.html).not.toContain("/auth/verify-email")
  return { resetPasswordUrl: linkTo(email.html, "/auth/forgot-password"), signInUrl: linkTo(email.html, "/auth/sign-in") }
}

export const expectResetPasswordEmail = async (request: APIRequestContext, recipient: string, expectedCount = 1): Promise<URL> => {
  const email = await latestEmail(request, recipient, EMAIL_PURPOSE.RESET_PASSWORD, expectedCount)

  expect(email.subject).toBe("Reset your password")
  return linkTo(email.html, "/auth/reset-password")
}

export const expectPasswordChangedEmail = async (request: APIRequestContext, recipient: string): Promise<void> => {
  const email = await latestEmail(request, recipient, EMAIL_PURPOSE.PASSWORD_CHANGED, 1)

  expect(email.subject).toBe(`Your ${APP_NAME} password was changed`)
  expect(email.html).toContain("/auth/forgot-password")
}

export const expectPurchaseConfirmation = async (request: APIRequestContext, recipient: string): Promise<string> => {
  const isConfirmation = ({ idempotencyKey }: { idempotencyKey: string }): boolean =>
    idempotencyKey.startsWith(`${EMAIL_PURPOSE.PURCHASE_CONFIRMATION}/`)

  await expect.poll(async () => (await getSentEmails(request, recipient)).filter(isConfirmation).length).toBe(1)

  const [email] = (await getSentEmails(request, recipient)).filter(isConfirmation)
  if (!email) throw new Error(`No purchase confirmation was sent to ${recipient}`)

  expect(email.to).toEqual([recipient])
  return `${email.subject}\n${email.html}`
}

export const expectWithdrawalAcknowledgement = async (request: APIRequestContext, recipient: string): Promise<string> => {
  const email = await latestEmail(request, recipient, EMAIL_PURPOSE.WITHDRAWAL_ACKNOWLEDGEMENT, 1)

  expect(email.subject).toBe("We received your withdrawal")
  return email.html
}

export const expectWithdrawalNotification = async (request: APIRequestContext, recipient: string, reference: string): Promise<string> => {
  const isNotification = ({ html, idempotencyKey }: { html: string; idempotencyKey: string }): boolean =>
    idempotencyKey.startsWith(`${EMAIL_PURPOSE.WITHDRAWAL_NOTIFICATION}/`) && html.includes(reference)

  await expect.poll(async () => (await getSentEmails(request, recipient)).filter(isNotification).length).toBe(1)

  const [email] = (await getSentEmails(request, recipient)).filter(isNotification)
  if (!email) throw new Error(`No withdrawal notification for ${reference} was sent to ${recipient}`)

  return email.html
}


export const expectChangeEmailConfirmation = async (request: APIRequestContext, recipient: string): Promise<URL> => {
  const email = await latestEmail(request, recipient, EMAIL_PURPOSE.CHANGE_EMAIL_CONFIRMATION, 1)

  expect(email.subject).toBe("Confirm your new email address")
  return linkTo(email.html, "/api/auth/verify-email")
}

export const expectDeleteAccountEmail = async (request: APIRequestContext, recipient: string): Promise<URL> => {
  const email = await latestEmail(request, recipient, EMAIL_PURPOSE.DELETE_ACCOUNT, 1)

  expect(email.subject).toBe("Confirm that you want to delete your account")
  return linkTo(email.html, "/app/settings/delete-account")
}
