import { env } from "cloudflare:workers"

import type * as StartServerModule from "@tanstack/react-start/server"
import { getRequest } from "@tanstack/react-start/server"
import { eq } from "drizzle-orm"
import { createHash } from "node:crypto"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"
import { failNextResendDelivery } from "~/src/platform/testing/lib/resend"
import { getSentEmails, resendApi } from "~/src/platform/testing/mocks/resend"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { HTTP_STATUS, IP_ADDRESS_HEADER } from "~/src/modules/_core/constants/api"
import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { license } from "~/src/modules/license/license.schema"
import {
  PURCHASED_AT,
  WITHDRAWAL_LICENSES,
  WITHDRAWAL_ORDERS,
  WITHDRAWAL_USERS,
  seedWithdrawalBuyers,
} from "~/src/modules/withdrawal/__test__/fixtures/withdrawal"
import { submitWithdrawalMutation } from "~/src/modules/withdrawal/use-cases/submit-withdrawal"
import { WITHDRAWAL_CHANNEL, WITHDRAWAL_ELIGIBILITY } from "~/src/modules/withdrawal/withdrawal.constants"
import { withdrawal } from "~/src/modules/withdrawal/withdrawal.schema"

import { MILLISECONDS_PER_DAY } from "~/src/lib/duration"

import acknowledgementMessages from "~/messages/en-US/emails.withdrawal-acknowledgement-email.json"
import notificationMessages from "~/messages/en-US/emails.withdrawal-notification-email.json"
import { APP_URL, CONTACT_EMAIL, NOTIFICATIONS_EMAIL } from "~/src/presentation/branding"

const SERVER_NOW = new Date("2026-11-12T12:00:00.000Z")
const AFTER_THE_PERIOD = new Date(PURCHASED_AT.getTime() + 15 * MILLISECONDS_PER_DAY)
const DELIVERED_AT = new Date("2026-11-11T08:00:00.000Z")
const ORIGIN = "http://127.0.0.1:3000"

const sha256 = (value: string): string => createHash("sha256").update(value).digest("hex")

const spaced = (text: string): string => text.replaceAll(/\s+/gu, " ")

const statement = (
  overrides: Partial<{ email: string; locale: (typeof I18N.SUPPORTED_LOCALES)[number]; name: string; reference: string }> = {},
) => ({
  email: "buyer@example.test",
  locale: I18N.DEFAULT_LOCALE,
  name: "Ada Buyer",
  reference: WITHDRAWAL_ORDERS.BUYER.id,
  ...overrides,
})

const signedOut = (): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())
}

const signedInAs = (userId: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId }))
}

const storedWithdrawals = () => db.select().from(withdrawal)

const onlyEmailTo = (recipient: string) => {
  const [email, ...others] = getSentEmails(recipient)
  expect(others).toStrictEqual([])
  if (email === undefined) {
    throw new Error(`No email was sent to ${recipient}`)
  }
  return { ...email, text: spaced(email.html) }
}

const failResendRequest = (failing: number): void => {
  const providerFetch = globalThis.fetch
  let requests = 0
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const request = new Request(input, init)
    if (new URL(request.url).origin === resendApi.origin) {
      requests += 1
      if (requests === failing) {
        return Promise.resolve(
          Response.json({ message: "Unavailable", name: "application_error" }, { status: HTTP_STATUS.SERVICE_UNAVAILABLE }),
        )
      }
    }
    return providerFetch(request)
  })
}

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

vi.mock(import("@tanstack/react-start/server"), (): Partial<typeof StartServerModule> => ({
  getRequest: vi.fn(() => new Request(`${ORIGIN}/`, { headers: new Headers() })),
}))

beforeEach(async () => {
  vi.useFakeTimers({ now: SERVER_NOW, toFake: ["Date"] })
  await seedWithdrawalBuyers()
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("submit-withdrawal", () => {
  it("records a signed-out buyer's statement against their licence and acknowledges it by email with its content and time", async () => {
    signedOut()

    const receipt = await executeMutation(submitWithdrawalMutation, statement({ locale: "pl-PL" }))

    const [row] = await storedWithdrawals()
    expect(row).toMatchObject({
      channel: WITHDRAWAL_CHANNEL.PUBLIC,
      eligibility: WITHDRAWAL_ELIGIBILITY.REFUNDABLE,
      email: "buyer@example.test",
      licenseId: WITHDRAWAL_LICENSES.BUYER,
      locale: "pl-PL",
      name: "Ada Buyer",
      polarOrderId: WITHDRAWAL_ORDERS.BUYER.id,
      reference: WITHDRAWAL_ORDERS.BUYER.id,
      userId: WITHDRAWAL_USERS.BUYER.id,
    })
    expect(row?.acknowledgedAt).toStrictEqual(SERVER_NOW)
    expect(receipt).toStrictEqual({
      acknowledged: true,
      email: "buyer@example.test",
      name: "Ada Buyer",
      reference: WITHDRAWAL_ORDERS.BUYER.id,
      submittedAt: row?.createdAt,
    })

    const acknowledgement = onlyEmailTo("buyer@example.test")
    expect(acknowledgement).toMatchObject({
      from: env.RESEND_EMAIL_FROM,
      idempotencyKey: `${EMAIL_PURPOSE.WITHDRAWAL_ACKNOWLEDGEMENT}/${sha256(row?.id ?? "")}`,
    })
    expect(acknowledgement.html).toContain('lang="pl-PL"')
    for (const value of ["Ada Buyer", WITHDRAWAL_ORDERS.BUYER.id, "buyer@example.test", "UTC"]) {
      expect(acknowledgement.text).toContain(value)
    }
  })

  it("tells the site's contact address who withdrew, from which licence and order, on what terms, with links to the account and Polar", async () => {
    signedOut()

    await executeMutation(submitWithdrawalMutation, statement({ email: "BUYER@example.test" }))

    const [row] = await storedWithdrawals()
    const notification = onlyEmailTo(CONTACT_EMAIL)
    expect(notification).toMatchObject({
      from: NOTIFICATIONS_EMAIL,
      idempotencyKey: `${EMAIL_PURPOSE.WITHDRAWAL_NOTIFICATION}/${sha256(row?.id ?? "")}`,
      subject: "Withdrawal from Ada Buyer",
    })
    expect(notification.html).toContain(`lang="${I18N.DEFAULT_LOCALE}"`)
    expect(notification.html).toContain(`href="${ORIGIN}/admin/users/${WITHDRAWAL_USERS.BUYER.id}"`)
    expect(notification.html).toContain(`/sales/${WITHDRAWAL_ORDERS.BUYER.id}"`)
    for (const value of ["Active Complete licence", notificationMessages.channel.public, "BUYER@example.test", "Sent by email on"]) {
      expect(notification.text).toContain(value)
    }
    expect(notification.text).toContain("The full refund before first use applies")
  })

  it("finds the licence by the invoice number from the purchase confirmation, in any letter case", async () => {
    signedOut()

    await executeMutation(submitWithdrawalMutation, statement({ reference: ` ${WITHDRAWAL_ORDERS.BUYER.invoiceNumber.toLowerCase()} ` }))

    await expect(storedWithdrawals()).resolves.toMatchObject([
      { licenseId: WITHDRAWAL_LICENSES.BUYER, reference: WITHDRAWAL_ORDERS.BUYER.invoiceNumber.toLowerCase() },
    ])
  })

  it("records the terms the licence had when the statement arrived", async () => {
    signedOut()
    await db.update(license).set({ deliveredAt: DELIVERED_AT }).where(eq(license.id, WITHDRAWAL_LICENSES.BUYER))

    await executeMutation(submitWithdrawalMutation, statement())
    await executeMutation(
      submitWithdrawalMutation,
      statement({ email: WITHDRAWAL_USERS.NO_CONSENT.email, name: "Grace Buyer", reference: WITHDRAWAL_ORDERS.NO_CONSENT.id }),
    )
    vi.setSystemTime(AFTER_THE_PERIOD)
    await executeMutation(
      submitWithdrawalMutation,
      statement({ email: WITHDRAWAL_USERS.NO_CONSENT.email, name: "Grace Buyer", reference: WITHDRAWAL_ORDERS.NO_CONSENT.id }),
    )

    const rows = await storedWithdrawals()
    expect(rows.map(({ eligibility }) => eligibility)).toStrictEqual([
      WITHDRAWAL_ELIGIBILITY.USED,
      WITHDRAWAL_ELIGIBILITY.STATUTORY_WITHDRAWAL,
      WITHDRAWAL_ELIGIBILITY.EXPIRED,
    ])
  })

  it.each([
    { case: "an email address that is not the buyer's", overrides: { email: "someone@example.test" } },
    { case: "an order number no licence has", overrides: { reference: "ord_unknown" } },
    {
      case: "the order of a refunded licence",
      overrides: { email: WITHDRAWAL_USERS.REFUNDED.email, reference: WITHDRAWAL_ORDERS.REFUNDED.id },
    },
  ])("still records and acknowledges a statement with $case, unmatched, and asks the owner to find the order", async ({ overrides }) => {
    signedOut()

    const receipt = await executeMutation(submitWithdrawalMutation, statement(overrides))

    const [row] = await storedWithdrawals()
    expect(row).toMatchObject({
      eligibility: WITHDRAWAL_ELIGIBILITY.UNMATCHED,
      licenseId: null,
      polarOrderId: null,
      userId: null,
    })
    expect(receipt.acknowledged).toBe(true)
    const notification = onlyEmailTo(CONTACT_EMAIL)
    expect(notification.text).toContain(notificationMessages.licence.unmatched)
    expect(notification.text).toContain(notificationMessages.eligibility.unmatched)
    expect(notification.html).not.toContain("/admin/users/")
    expect(notification.html).not.toContain("/sales/")
  })

  it("identifies a signed-in buyer by their account, whatever address they want the acknowledgement at", async () => {
    signedInAs(WITHDRAWAL_USERS.BUYER.id)

    await executeMutation(submitWithdrawalMutation, statement({ email: "elsewhere@example.test" }))

    await expect(storedWithdrawals()).resolves.toMatchObject([
      {
        channel: WITHDRAWAL_CHANNEL.ACCOUNT,
        email: "elsewhere@example.test",
        licenseId: WITHDRAWAL_LICENSES.BUYER,
        userId: WITHDRAWAL_USERS.BUYER.id,
      },
    ])
    expect(onlyEmailTo(CONTACT_EMAIL).text).toContain(notificationMessages.channel.account)
    expect(onlyEmailTo("elsewhere@example.test").subject).toBe(acknowledgementMessages.subject)
  })

  it("keeps a signed-in visitor's unmatched statement on their own account", async () => {
    signedInAs(WITHDRAWAL_USERS.VISITOR.id)

    await executeMutation(submitWithdrawalMutation, statement({ email: WITHDRAWAL_USERS.VISITOR.email }))

    await expect(storedWithdrawals()).resolves.toMatchObject([
      { eligibility: WITHDRAWAL_ELIGIBILITY.UNMATCHED, licenseId: null, userId: WITHDRAWAL_USERS.VISITOR.id },
    ])
  })
})

describe("submit-withdrawal delivery", () => {
  it("keeps the statement and says so when the acknowledgement cannot be sent, and the owner learns it is still owed", async () => {
    signedOut()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    failNextResendDelivery()

    const receipt = await executeMutation(submitWithdrawalMutation, statement())

    expect(receipt.acknowledged).toBe(false)
    await expect(storedWithdrawals()).resolves.toMatchObject([{ acknowledgedAt: null }])
    expect(getSentEmails("buyer@example.test")).toStrictEqual([])
    expect(onlyEmailTo(CONTACT_EMAIL).text).toContain(notificationMessages.acknowledgement.notSent)
    expect(consoleError).toHaveBeenCalledWith("[withdrawal] acknowledgement not sent", expect.any(Error))
  })

  it("still answers with the receipt when the owner's notification cannot be sent", async () => {
    signedOut()
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {})
    failResendRequest(2)

    const receipt = await executeMutation(submitWithdrawalMutation, statement())

    expect(receipt.acknowledged).toBe(true)
    expect(getSentEmails(CONTACT_EMAIL)).toStrictEqual([])
    expect(consoleError).toHaveBeenCalledWith("[withdrawal] owner notification not sent", expect.any(Error))
  })

  it("acknowledges at most three statements to one address per hour, and records every one", async () => {
    signedOut()
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {})

    for (const client of ["203.0.113.1", "203.0.113.2", "203.0.113.3", "203.0.113.4"]) {
      vi.mocked(getRequest).mockReturnValue(new Request(`${ORIGIN}/`, { headers: { [IP_ADDRESS_HEADER]: client } }))
      await executeMutation(submitWithdrawalMutation, statement())
    }

    expect(await storedWithdrawals()).toHaveLength(4)
    expect(getSentEmails("buyer@example.test")).toHaveLength(3)
    expect(consoleWarn).toHaveBeenCalledWith("[withdrawal] acknowledgement not sent: the recipient reached the hourly limit")
  })
})

describe("submit-withdrawal limits", () => {
  it("refuses a fourth statement from one client within a minute", async () => {
    signedOut()

    await executeMutation(submitWithdrawalMutation, statement())
    await executeMutation(submitWithdrawalMutation, statement())
    await executeMutation(submitWithdrawalMutation, statement())

    await expect(executeMutation(submitWithdrawalMutation, statement())).rejects.toThrow(ERROR_CODES.TOO_MANY_REQUESTS)
  })

  it.each([
    { case: "an empty name", overrides: { name: " " } },
    { case: "an invalid email address", overrides: { email: "not-an-email" } },
    { case: "an empty order number", overrides: { reference: "" } },
  ])("rejects $case and stores nothing", async ({ overrides }) => {
    signedOut()

    await expect(executeMutation(submitWithdrawalMutation, statement(overrides))).rejects.toThrow(ERROR_CODES.VALIDATION)
    expect(await storedWithdrawals()).toStrictEqual([])
  })

  it("rejects an untrusted deployment before recording anything", async () => {
    signedOut()
    vi.mocked(getRequest).mockReturnValue(new Request(`${APP_URL}.attacker.example/_serverFn/withdraw`))

    await expect(executeMutation(submitWithdrawalMutation, statement())).rejects.toThrow(ERROR_CODES.FORBIDDEN)
    expect(await storedWithdrawals()).toStrictEqual([])
  })
})
