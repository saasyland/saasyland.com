import { env } from "cloudflare:workers"

import type { models } from "@polar-sh/sdk/2026-10"
import { createHash } from "node:crypto"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { getSentEmails } from "~/src/platform/testing/mocks/resend"

import { EMAIL_PURPOSE } from "~/src/integrations/resend/resend.constants"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"
import { sendUnmatchedOrderAlert } from "~/src/modules/license/use-cases/send-unmatched-order-alert"

import { POLAR_DASHBOARD_HOSTS, POLAR_ORGANIZATION_SLUG } from "~/src/data/polar"

import messages from "~/messages/en-US/emails.unmatched-order-alert-email.json"
import { CONTACT_EMAIL, NOTIFICATIONS_EMAIL } from "~/src/presentation/branding"

const ORDER_ID = "8b0f5a52-2f3c-4d47-9f0e-0c6a3f6f9d21"

vi.mock(import("@tanstack/react-start/server-only"), () => ({}))

const GUEST = { email: "guest@example.test", name: "Grace Hopper" }

const order = (customer: Pick<models.OrderCustomer, "email" | "name"> = GUEST) => ({
  created_at: "2026-11-16T09:30:00.000Z",
  currency: "eur",
  customer,
  id: ORDER_ID,
  total_amount: 71_920,
})

const spaced = (text: string): string => text.replaceAll(/\s+/gu, " ")

const onlyAlert = () => {
  const [email, ...others] = getSentEmails(CONTACT_EMAIL)
  expect(others).toStrictEqual([])
  if (email === undefined) {
    throw new Error(`No email was sent to ${CONTACT_EMAIL}`)
  }
  return { ...email, text: spaced(email.html) }
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("the unmatched order alert", () => {
  it("tells the site's contact address in the default language what was paid, by whom, and links the order in Polar, once per order", async () => {
    await sendUnmatchedOrderAlert({ order: order(), tier: LICENSE_TIER.AGENCY })
    await sendUnmatchedOrderAlert({ order: order(), tier: LICENSE_TIER.AGENCY })

    const alert = onlyAlert()
    expect(alert).toMatchObject({
      from: NOTIFICATIONS_EMAIL,
      idempotencyKey: `${EMAIL_PURPOSE.UNMATCHED_ORDER_ALERT}/${createHash("sha256").update(ORDER_ID).digest("hex")}`,
      subject: "Paid Agency order without a licence",
      to: [CONTACT_EMAIL],
    })
    expect(alert.html).toContain(`lang="${I18N.DEFAULT_LOCALE}"`)
    expect(alert.text).toContain(messages.heading)
    expect(alert.text).toContain("Polar reported a paid Agency order whose customer matches no account here")
    for (const value of [ORDER_ID, "Nov 16, 2026, 9:30 AM UTC", "Agency", "€719.20", "guest@example.test", "Grace Hopper"]) {
      expect(alert.text).toContain(value)
    }
    expect(alert.html).toContain(
      `href="https://${POLAR_DASHBOARD_HOSTS[env.POLAR_SERVER]}/dashboard/${POLAR_ORGANIZATION_SLUG}/sales/${ORDER_ID}"`,
    )
    expect(alert.text).toContain("redeliver the order’s order.paid and benefit_grant.created webhook events in Polar")
  })

  it("says so when the order carries no customer email or name", async () => {
    await sendUnmatchedOrderAlert({ order: order({ email: JSON_NULL, name: JSON_NULL }), tier: LICENSE_TIER.CORE })

    const { text } = onlyAlert()
    expect(text.split(messages.notGiven)).toHaveLength(3)
  })

  it("throws when Resend refuses the alert, so the webhook fails and Polar delivers the order again", async () => {
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

    await expect(sendUnmatchedOrderAlert({ order: order(), tier: LICENSE_TIER.CORE })).rejects.toThrow(
      `Failed to send "Paid Core order without a licence" to ${CONTACT_EMAIL}`,
    )
  })
})
