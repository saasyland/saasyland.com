import { setTimeout as delay } from "node:timers/promises"

import { type ErrorResponse, Resend } from "resend"
import * as zod from "zod"

import { expect } from "../fixtures/test"
import { JOURNEY_SETTINGS } from "./settings"

const VERIFICATION_SUBJECT = "Verify your email address"
const RECENT_EMAILS = 100
const DELIVERY_TIMEOUT_MS = 120_000
const POLL_INTERVALS_MS = [2000, 5000]
const VERIFICATION_LINK = /href="(?<link>[^"]*\/auth\/verify-email\?[^"]*token=[^"]+)"/u
const RATE_LIMITED: ErrorResponse["name"] = "rate_limit_exceeded"
const RATE_LIMIT_PAUSE_MS = 1000

const resend = new Resend(JOURNEY_SETTINGS.RESEND_API_KEY)

export const inboxAddress = (label: string): string => `delivered+${label}@resend.dev`

const withinRateLimit = async <Reply extends { readonly error: ErrorResponse | null }>(
  request: () => Promise<Reply>,
): Promise<Reply> => {
  const response = await request()

  if (response.error?.name !== RATE_LIMITED) {
    return response
  }

  await delay(RATE_LIMIT_PAUSE_MS)

  return withinRateLimit(request)
}

const sentEmailId = async (recipient: string, subject: string): Promise<string | undefined> => {
  const { data, error } = await withinRateLimit(async () => resend.emails.list({ limit: RECENT_EMAILS }))

  if (error) {
    throw new Error(`Resend did not list the sent emails: ${error.message}`)
  }

  return data.data.find((email) => email.subject === subject && email.to.includes(recipient))?.id
}

export const deliveredEmailHtml = async (recipient: string, subject: string): Promise<string> => {
  await expect
    .poll(async () => sentEmailId(recipient, subject), { intervals: POLL_INTERVALS_MS, timeout: DELIVERY_TIMEOUT_MS })
    .toEqual(expect.any(String))

  const id = zod.string().parse(await sentEmailId(recipient, subject))
  const { data, error } = await withinRateLimit(async () => resend.emails.get(id))

  if (error) {
    throw new Error(`Resend did not return the email "${subject}" sent to ${recipient}: ${error.message}`)
  }

  return data.html ?? ""
}

export const verificationLink = async (recipient: string): Promise<URL> => {
  const link = VERIFICATION_LINK.exec(await deliveredEmailHtml(recipient, VERIFICATION_SUBJECT))?.groups?.["link"]

  if (link === undefined) {
    throw new Error(`The verification email sent to ${recipient} has no verification link`)
  }

  return new URL(link.replaceAll("&amp;", "&"))
}
