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

const verificationEmailId = async (recipient: string): Promise<string | undefined> => {
  const { data, error } = await resend.emails.list({ limit: RECENT_EMAILS })

  if (error) {
    throw new Error(`Resend did not list the sent emails: ${error.message}`)
  }

  return data.data.find(({ subject, to }) => subject === VERIFICATION_SUBJECT && to.includes(recipient))?.id
}

export const verificationLink = async (recipient: string): Promise<URL> => {
  await expect
    .poll(async () => verificationEmailId(recipient), { intervals: POLL_INTERVALS_MS, timeout: DELIVERY_TIMEOUT_MS })
    .toEqual(expect.any(String))

  const { data, error } = await resend.emails.get(zod.string().parse(await verificationEmailId(recipient)))

  if (error) {
    throw new Error(`Resend did not return the verification email sent to ${recipient}: ${error.message}`)
  }

  const link = VERIFICATION_LINK.exec(data.html ?? "")?.groups?.["link"]

  if (link === undefined) {
    throw new Error(`The verification email sent to ${recipient} has no verification link`)
  }

  return new URL(link.replaceAll("&amp;", "&"))
}
