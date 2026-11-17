import { Resend } from "resend"
import * as zod from "zod"

import { expect } from "../fixtures/test"
import { JOURNEY_SETTINGS } from "./settings"

const VERIFICATION_SUBJECT = "Verify your email address"
const RECENT_EMAILS = 100
const DELIVERY_TIMEOUT_MS = 120_000
const POLL_INTERVALS_MS = [2000, 5000]
const VERIFICATION_LINK = /href="(?<link>[^"]*\/auth\/verify-email\?[^"]*token=[^"]+)"/u

const resend = new Resend(JOURNEY_SETTINGS.RESEND_API_KEY)

export const inboxAddress = (label: string): string => `delivered+${label}@resend.dev`

const sentEmailId = async (recipient: string, subject: string): Promise<string | undefined> => {
  const { data, error } = await resend.emails.list({ limit: RECENT_EMAILS })

  if (error) {
    throw new Error(`Resend did not list the sent emails: ${error.message}`)
  }

  return data.data.find((email) => email.subject === subject && email.to.includes(recipient))?.id
}

const deliveredHtml = async (recipient: string, subject: string): Promise<string> => {
  await expect
    .poll(async () => sentEmailId(recipient, subject), { intervals: POLL_INTERVALS_MS, timeout: DELIVERY_TIMEOUT_MS })
    .toEqual(expect.any(String))

  const { data, error } = await resend.emails.get(zod.string().parse(await sentEmailId(recipient, subject)))

  if (error) {
    throw new Error(`Resend did not return the email "${subject}" sent to ${recipient}: ${error.message}`)
  }

  return data.html ?? ""
}

export const verificationLink = async (recipient: string): Promise<URL> => {
  const link = VERIFICATION_LINK.exec(await deliveredHtml(recipient, VERIFICATION_SUBJECT))?.groups?.["link"]

  if (link === undefined) {
    throw new Error(`The verification email sent to ${recipient} has no verification link`)
  }

  return new URL(link.replaceAll("&amp;", "&"))
}

export const purchaseConfirmation = async (recipient: string, subject: string): Promise<string> => deliveredHtml(recipient, subject)
