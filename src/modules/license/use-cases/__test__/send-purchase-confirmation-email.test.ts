import type { models } from "@polar-sh/sdk/2026-10"
import { createHash } from "node:crypto"
import { createFormatter, createTranslator } from "use-intl"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { LICENSE_EMAIL_PURPOSE, LICENSE_TIER } from "~/src/modules/license/license.constants"
import { sendPurchaseConfirmationEmail } from "~/src/modules/license/use-cases/send-purchase-confirmation-email"
import { ORDER_CHECKOUT_METADATA } from "~/src/modules/order/order.constants"

import { CLI_SETUP_LINES } from "~/src/data/cli"
import { REFUND_TERMS } from "~/src/data/refunds"

import coursesStep from "~/messages/en-US/purchase-email.courses.json"
import plMessages from "~/messages/pl-PL/emails.purchase-confirmation-email.json"
import plCoursesStep from "~/messages/pl-PL/purchase-email.courses.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const RECIPIENT = "buyer@example.test"
const BUYER = { email: RECIPIENT, id: "buyer-1" }
const ORDER_ID = "6f1c2c4e-0f63-4a4b-9a7e-1f6d2f0c9b11"
const INVOICE_NUMBER = "SAASYLAND-0001"
const ORIGIN = "http://127.0.0.1:3000"

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))
vi.mock(import("~/src/modules/lesson/lesson.access"), async (importOriginal) => ({
  ...(await importOriginal()),
  holdsCourseAccess: (userId: string) => Promise.resolve(userId === BUYER.id),
}))

const order = (fields: Partial<models.Order> = {}) => ({
  created_at: "2026-09-24T10:00:00.000Z",
  currency: "usd",
  id: ORDER_ID,
  invoice_number: INVOICE_NUMBER,
  metadata: { [ORDER_CHECKOUT_METADATA.LOCALE]: "en-US" },
  total_amount: 39_900,
  ...fields,
})

const spaced = (text: string): string => text.replaceAll(/\s+/gu, " ")

const onlyEmail = () => {
  const [email, ...others] = getSentEmails(RECIPIENT)
  expect(others).toStrictEqual([])
  if (email === undefined) {
    throw new Error(`No email was sent to ${RECIPIENT}`)
  }
  return { ...email, text: spaced(email.html) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the purchase confirmation", () => {
  it("confirms an English purchase with consent to immediate supply, once per order", async () => {
    const paid = order()

    await sendPurchaseConfirmationEmail({ order: paid, recipient: BUYER, tier: LICENSE_TIER.COMPLETE, withdrawalConsent: true })
    await sendPurchaseConfirmationEmail({ order: paid, recipient: BUYER, tier: LICENSE_TIER.COMPLETE, withdrawalConsent: true })

    const email = onlyEmail()
    expect(email).toMatchObject({
      idempotencyKey: `${LICENSE_EMAIL_PURPOSE.PURCHASE_CONFIRMATION}/${createHash("sha256").update(ORDER_ID).digest("hex")}`,
      subject: "Your SaaSy Land Complete licence",
      to: [RECIPIENT],
    })
    expect(email.html).toContain('lang="en-US"')
    expect(email.text).toContain("Thank you for buying Complete")
    expect(email.text).toContain(`Order ${INVOICE_NUMBER} · Sep 24, 2026 · SaaSy Land Complete licence · $399.00 paid.`)
    expect(email.text).toContain(
      `acknowledged that you lose your ${String(REFUND_TERMS.WITHDRAWAL_DAYS)}-day right of withdrawal once supply begins.`,
    )
    expect(email.text).not.toContain("without giving a reason")
    expect(email.text).toContain(
      "You can still get a full refund until Oct 8, 2026, 10:00 AM UTC if you have not generated a project with the CLI or opened a paid lesson.",
    )
    expect(email.text).toContain("in force on Sep 24, 2026 apply to this purchase.")
    for (const path of [ROUTES.APP.LICENSE, ROUTES.DOCS.CLI, ROUTES.TERMS, ROUTES.LICENCE, ROUTES.REFUNDS, ROUTES.WITHDRAWAL]) {
      expect(email.html).toContain(`href="${ORIGIN}${path}"`)
    }
    expect(email.html).toContain(`href="mailto:${CONTACT_EMAIL}"`)
  })

  it("brands the email and ends with the steps from the key to a first project, with the link written out", async () => {
    await sendPurchaseConfirmationEmail({ order: order(), recipient: BUYER, tier: LICENSE_TIER.COMPLETE, withdrawalConsent: true })

    const { html, text } = onlyEmail()
    expect(text).toContain("SaaSy Land")
    expect(text).toContain("Get started")
    expect(text).toContain("Open your licence")
    expect(text).toContain(`If the button does not work, open this link:<br/><a href="${ORIGIN}/app/license"`)
    for (const { command } of CLI_SETUP_LINES) {
      expect(html).toContain(command)
    }
    expect(text).toContain(`the ${String(REFUND_TERMS.WITHDRAWAL_DAYS)}-day refund no longer applies after it`)
    expect(text).toContain(coursesStep.text)
    expect(html).toContain(`href="${ORIGIN}${ROUTES.COURSES}"`)
  })

  it("leaves out the courses for a buyer whose licence does not include them", async () => {
    await sendPurchaseConfirmationEmail({
      order: order(),
      recipient: { email: RECIPIENT, id: "buyer-2" },
      tier: LICENSE_TIER.CORE,
      withdrawalConsent: true,
    })

    expect(onlyEmail().text).not.toContain(coursesStep.text)
  })

  it("confirms the statutory right of withdrawal when the order carries no consent", async () => {
    await sendPurchaseConfirmationEmail({ order: order(), recipient: BUYER, tier: LICENSE_TIER.CORE, withdrawalConsent: false })

    const { text } = onlyEmail()
    expect(text).toContain(
      `You can withdraw from this purchase within ${String(REFUND_TERMS.WITHDRAWAL_DAYS)} days of the order date without giving a reason: use <a href="${ORIGIN}${ROUTES.WITHDRAWAL}"`,
    )
    expect(text).toContain(`or write to <a href="mailto:${CONTACT_EMAIL}"`)
    expect(text).not.toContain("the right of withdrawal does not apply")
  })

  it("writes in the language of the checkout, with its tier names, dates, amount and links", async () => {
    const paid = order({ currency: "jpy", metadata: { [ORDER_CHECKOUT_METADATA.LOCALE]: "pl-PL" }, total_amount: 59_800 })
    const t = createTranslator({ locale: "pl-PL", messages: plMessages })
    const format = createFormatter({ formats: I18N.FORMATS, locale: "pl-PL", timeZone: I18N.DEFAULT_TIMEZONE })
    const date = format.dateTime(new Date(paid.created_at), "calendarDate")
    const amount = format.number(59_800, { currency: "JPY", style: "currency" })
    const details = spaced(t("details", { amount, date, reference: INVOICE_NUMBER, tier: "Komplet" }))
    const waived = spaced(t("withdrawal.waived", { days: REFUND_TERMS.WITHDRAWAL_DAYS }))

    await sendPurchaseConfirmationEmail({ order: paid, recipient: BUYER, tier: LICENSE_TIER.COMPLETE, withdrawalConsent: true })

    const email = onlyEmail()
    expect(email.subject).toBe("Twoja licencja SaaSy Land na pakiet Komplet")
    expect(email.html).toContain('lang="pl-PL"')
    expect(email.text).toContain(details)
    expect(email.text).toContain(waived)
    expect(email.html).toContain(`href="${ORIGIN}/pl-PL/app/license"`)
    expect(email.html).toContain(`href="${ORIGIN}/pl-PL/refunds"`)
    expect(email.html).toContain(`href="${ORIGIN}/pl-PL/withdrawal"`)
    expect(email.html).toContain(`href="${ORIGIN}/pl-PL${ROUTES.COURSES}"`)
    expect(email.text).toContain(plCoursesStep.text)
  })

  it.each([
    ["no locale", {}],
    ["a locale the site does not speak", { [ORDER_CHECKOUT_METADATA.LOCALE]: "xx-XX" }],
  ])("writes in English to an order with %s, naming it by its Polar ID before it has an invoice", async (_case, metadata) => {
    await sendPurchaseConfirmationEmail({
      order: order({ invoice_number: JSON_NULL, metadata }),
      recipient: BUYER,
      tier: LICENSE_TIER.AGENCY,
      withdrawalConsent: true,
    })

    const email = onlyEmail()
    expect(email.html).toContain(`lang="${I18N.DEFAULT_LOCALE}"`)
    expect(email.subject).toBe("Your SaaSy Land Agency licence")
    expect(email.text).toContain(`Order ${ORDER_ID} ·`)
  })

  it("throws when Resend refuses the email, so the webhook fails and Polar delivers the order again", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          Response.json(
            { message: "Resend is unavailable", name: "application_error", statusCode: HTTP_STATUS.INTERNAL_SERVER_ERROR },
            { status: HTTP_STATUS.INTERNAL_SERVER_ERROR },
          ),
        ),
      ),
    )

    await expect(
      sendPurchaseConfirmationEmail({ order: order(), recipient: BUYER, tier: LICENSE_TIER.CORE, withdrawalConsent: true }),
    ).rejects.toThrow(`Failed to send "Your SaaSy Land Core licence" to ${RECIPIENT}`)
  })
})
