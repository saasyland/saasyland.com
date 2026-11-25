import { readFileSync } from "node:fs"

import type { APIRequestContext } from "@playwright/test"
import * as zod from "zod"

import { I18N, type SupportedLocale } from "../../src/integrations/use-intl/i18n.config"

import { ACCOUNT_EMAIL_PURPOSE } from "../../src/modules/account/account.constants"
import { USER_EMAIL_PURPOSE } from "../../src/modules/user/user.constants"
import { VERIFICATION_EMAIL_PURPOSE } from "../../src/modules/verification/verification.constants"
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

type SentEmail = zod.infer<typeof sentEmailsSchema>[number]

export const getSentEmails = async (request: APIRequestContext, recipient: string): Promise<zod.infer<typeof sentEmailsSchema>> => {
  const response = await request.get("/__test/emails", { params: { to: recipient } })
  expect(response.ok()).toBe(true)
  return sentEmailsSchema.parse(await response.json())
}

const emailsFor = async (request: APIRequestContext, recipient: string, purpose: string): Promise<zod.infer<typeof sentEmailsSchema>> =>
  (await getSentEmails(request, recipient)).filter(({ idempotencyKey }) => idempotencyKey.startsWith(`${purpose}/`))

const subjectSchema = zod.object({ subject: zod.string() })

const verificationSubject = (locale: SupportedLocale): string =>
  subjectSchema.parse(JSON.parse(readFileSync(new URL(`../../messages/${locale}/emails.verify-email.json`, import.meta.url), "utf8"))).subject

export const expectNoEmail = async (request: APIRequestContext, recipient: string): Promise<void> => {
  expect(await getSentEmails(request, recipient)).toEqual([])
}

export const expectVerificationEmail = async (
  request: APIRequestContext,
  recipient: string,
  expectedCount = 1,
  locale: SupportedLocale = I18N.DEFAULT_LOCALE,
): Promise<URL> => {
  await expect.poll(async () => (await emailsFor(request, recipient, VERIFICATION_EMAIL_PURPOSE.VERIFY_EMAIL)).length).toBe(expectedCount)

  const emails = await emailsFor(request, recipient, VERIFICATION_EMAIL_PURPOSE.VERIFY_EMAIL)
  const email = emails.at(-1)
  if (!email) throw new Error(`No verification email was sent to ${recipient}`)

  expect(email.subject).toBe(verificationSubject(locale))
  expect(email.to).toEqual([recipient])
  expect(email.html).toContain(`lang="${locale}"`)
  const verificationLink = email.html.match(/href="([^"]*\/auth\/verify-email\?[^"]*token=[^"]+)"/u)?.[1]
  if (!verificationLink) throw new Error("The verification email has no account verification link")

  const verificationUrl = new URL(verificationLink.replaceAll("&amp;", "&"))
  expect(verificationUrl.searchParams.get("token")).toBeTruthy()
  expect(email.idempotencyKey).toMatch(new RegExp(`^${VERIFICATION_EMAIL_PURPOSE.VERIFY_EMAIL}/[0-9a-f]{64}$`, "u"))
  return verificationUrl
}

export const latestEmail = async (
  request: APIRequestContext,
  recipient: string,
  purpose: string,
  expectedCount: number,
): Promise<SentEmail> => {
  await expect.poll(async () => (await emailsFor(request, recipient, purpose)).length).toBe(expectedCount)

  const email = (await emailsFor(request, recipient, purpose)).at(-1)
  if (!email) throw new Error(`No ${purpose} email was sent to ${recipient}`)

  expect(email.to).toEqual([recipient])
  return email
}

export const linkTo = (html: string, path: string): URL => {
  const link = [...html.matchAll(/href="([^"]+)"/gu)].map(([, href]) => href ?? "").find((href) => new URL(href.replaceAll("&amp;", "&")).pathname.includes(path))
  if (link === undefined) throw new Error(`The email has no link to ${path}`)

  return new URL(link.replaceAll("&amp;", "&"))
}

export const expectExistingAccountEmail = async (
  request: APIRequestContext,
  recipient: string,
  expectedCount = 1,
): Promise<{ resetPasswordUrl: URL; signInUrl: URL }> => {
  const email = await latestEmail(request, recipient, ACCOUNT_EMAIL_PURPOSE.EXISTING_ACCOUNT, expectedCount)

  expect(email.subject).toBe(`You already have a ${APP_NAME} account`)
  expect(email.html).toContain('lang="en-US"')
  expect(email.html).not.toContain("/auth/verify-email")
  return { resetPasswordUrl: linkTo(email.html, "/auth/forgot-password"), signInUrl: linkTo(email.html, "/auth/sign-in") }
}

export const expectResetPasswordEmail = async (request: APIRequestContext, recipient: string, expectedCount = 1): Promise<URL> => {
  const email = await latestEmail(request, recipient, VERIFICATION_EMAIL_PURPOSE.RESET_PASSWORD, expectedCount)

  expect(email.subject).toBe("Reset your password")
  return linkTo(email.html, "/auth/reset-password")
}

export const expectPasswordChangedEmail = async (request: APIRequestContext, recipient: string): Promise<void> => {
  const email = await latestEmail(request, recipient, ACCOUNT_EMAIL_PURPOSE.PASSWORD_CHANGED, 1)

  expect(email.subject).toBe(`Your ${APP_NAME} password was changed`)
  expect(email.html).toContain("/auth/forgot-password")
}

export const expectChangeEmailConfirmation = async (request: APIRequestContext, recipient: string): Promise<URL> => {
  const email = await latestEmail(request, recipient, ACCOUNT_EMAIL_PURPOSE.CHANGE_EMAIL_CONFIRMATION, 1)

  expect(email.subject).toBe("Confirm your new email address")
  return linkTo(email.html, "/api/auth/verify-email")
}

export const expectDeleteAccountEmail = async (request: APIRequestContext, recipient: string): Promise<URL> => {
  const email = await latestEmail(request, recipient, USER_EMAIL_PURPOSE.DELETE_ACCOUNT, 1)

  expect(email.subject).toBe("Confirm that you want to delete your account")
  return linkTo(email.html, "/app/settings/delete-account")
}

