import type { APIRequestContext } from "@playwright/test"

import { LICENSE_EMAIL_PURPOSE } from "../../src/modules/license/license.constants"
import { WITHDRAWAL_EMAIL_PURPOSE } from "../../src/modules/withdrawal/withdrawal.constants"
import { getSentEmails, latestEmail } from "./emails"
import { expect } from "./test"

export const expectPurchaseConfirmation = async (request: APIRequestContext, recipient: string): Promise<string> => {
  const isConfirmation = ({ idempotencyKey }: { idempotencyKey: string }): boolean =>
    idempotencyKey.startsWith(`${LICENSE_EMAIL_PURPOSE.PURCHASE_CONFIRMATION}/`)

  await expect.poll(async () => (await getSentEmails(request, recipient)).filter(isConfirmation).length).toBe(1)

  const [email] = (await getSentEmails(request, recipient)).filter(isConfirmation)
  if (!email) throw new Error(`No purchase confirmation was sent to ${recipient}`)

  expect(email.to).toEqual([recipient])
  return `${email.subject}\n${email.html}`
}

export const expectWithdrawalAcknowledgement = async (request: APIRequestContext, recipient: string): Promise<string> => {
  const email = await latestEmail(request, recipient, WITHDRAWAL_EMAIL_PURPOSE.WITHDRAWAL_ACKNOWLEDGEMENT, 1)

  expect(email.subject).toBe("We received your withdrawal")
  return email.html
}

export const expectWithdrawalNotification = async (request: APIRequestContext, recipient: string, reference: string): Promise<string> => {
  const isNotification = ({ html, idempotencyKey }: { html: string; idempotencyKey: string }): boolean =>
    idempotencyKey.startsWith(`${WITHDRAWAL_EMAIL_PURPOSE.WITHDRAWAL_NOTIFICATION}/`) && html.includes(reference)

  await expect.poll(async () => (await getSentEmails(request, recipient)).filter(isNotification).length).toBe(1)

  const [email] = (await getSentEmails(request, recipient)).filter(isNotification)
  if (!email) throw new Error(`No withdrawal notification for ${reference} was sent to ${recipient}`)

  return email.html
}
