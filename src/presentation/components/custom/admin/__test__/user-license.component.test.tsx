import { render, screen, within } from "@testing-library/react"
import { createTranslator } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { FIRST_USE, LICENSE_STATUS, LICENSE_TIER, REFUND_ELIGIBILITY } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { userLicenseQuery } from "~/src/modules/license/use-cases/get-user-license"

import { USER_LICENSE_DETAILS } from "~/src/data/license"
import { REFUND_TERMS } from "~/src/data/refunds"

import { adminQueryClient, renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { UserLicensePending } from "~/src/presentation/components/custom/admin/license-pending"
import { UserLicense } from "~/src/presentation/components/custom/admin/users/user-license"

import commonMessages from "~/messages/en-US/common.json"
import pricingMessages from "~/messages/en-US/components.custom.pricing.json"
import labels from "~/messages/en-US/pages.admin.users.license.json"

const USER_ID = "grace"
const PURCHASED_AT = new Date("2026-11-10T09:30:00.000Z")
const ACTIVATED_AT = new Date("2026-11-10T09:45:00.000Z")
const DELIVERED_AT = new Date("2026-11-11T16:20:00.000Z")
const LESSON_OPENED_AT = new Date("2026-11-11T12:05:00.000Z")
const PERIOD_END = new Date("2026-11-24T09:30:00.000Z")

const t = createTranslator({ formats: I18N.FORMATS, locale: "en-US", messages: labels, timeZone: I18N.DEFAULT_TIMEZONE })
const common = createTranslator({ formats: I18N.FORMATS, locale: "en-US", messages: commonMessages, timeZone: I18N.DEFAULT_TIMEZONE })
const dateTime = (value: Date): string => common("dateTime", { value })

const licence = (overrides: Partial<NonNullable<License["userLicense"]>> = {}): NonNullable<License["userLicense"]> => ({
  activatedAt: ACTIVATED_AT,
  deliveredAt: null,
  lessonOpenedAt: null,
  purchaseCreatedAt: PURCHASED_AT,
  refund: { kind: REFUND_ELIGIBILITY.REFUNDABLE, until: PERIOD_END },
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.COMPLETE,
  withdrawalConsentAt: PURCHASED_AT,
  ...overrides,
})

const renderCard = (license: License["userLicense"]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(userLicenseQuery({ userId: USER_ID }).queryKey, { license })
  return renderAdmin(<UserLicense userId={USER_ID} />, { queryClient })
}

const detail = (label: string): string | null => screen.getByText(label, { selector: "dt" }).nextElementSibling?.textContent ?? null

const card = async (): Promise<HTMLElement> => {
  const heading = await screen.findByRole("heading", { level: 2, name: labels.title })
  const container = heading.closest<HTMLElement>("[data-slot=card]")
  if (container === null) {
    throw new Error("The licence heading is outside a card")
  }
  return container
}

describe("admin licence card", () => {
  it("shows the tier, status, purchase, consent and first uses of a licence that can still be refunded", async () => {
    renderCard(licence())
    await card()

    expect(detail(labels.details.tier)).toBe(pricingMessages.tiers.complete.name)
    expect(detail(labels.details.status)).toBe(labels.status.active)
    expect(detail(labels.details.purchasedAt)).toBe(dateTime(PURCHASED_AT))
    expect(detail(labels.details.withdrawalConsent)).toBe(t("consent.given", { date: dateTime(PURCHASED_AT) }))
    expect(detail(labels.details.firstActivation)).toBe(dateTime(ACTIVATED_AT))
    expect(detail(labels.details.firstDownload)).toBe(labels.never)
    expect(detail(labels.details.firstLesson)).toBe(labels.never)
    expect(detail(labels.details.refund)).toBe(
      "Refundable until Nov 24, 2026, 9:30 AM UTC. The buyer consented to immediate delivery, the CLI has not downloaded templates with this licence, and no paid lesson has been opened yet.",
    )
  })

  it("names the first template download that ended the voluntary refund", async () => {
    renderCard(
      licence({
        deliveredAt: DELIVERED_AT,
        refund: { kind: REFUND_ELIGIBILITY.USED, usedAt: DELIVERED_AT, via: FIRST_USE.TEMPLATES },
      }),
    )
    await card()

    expect(detail(labels.details.firstDownload)).toBe(dateTime(DELIVERED_AT))
    expect(detail(labels.details.refund)).toBe(
      "Not refundable. The buyer consented to immediate delivery, and the CLI downloaded templates with this licence on Nov 11, 2026, 4:20 PM UTC.",
    )
  })

  it("names the first paid lesson that ended the voluntary refund, before any template download", async () => {
    renderCard(
      licence({
        deliveredAt: DELIVERED_AT,
        lessonOpenedAt: LESSON_OPENED_AT,
        refund: { kind: REFUND_ELIGIBILITY.USED, usedAt: LESSON_OPENED_AT, via: FIRST_USE.LESSON },
      }),
    )
    await card()

    expect(detail(labels.details.firstLesson)).toBe(dateTime(LESSON_OPENED_AT))
    expect(detail(labels.details.refund)).toBe(
      "Not refundable. The buyer consented to immediate delivery, and opened a paid lesson on Nov 11, 2026, 12:05 PM UTC.",
    )
  })

  it("explains the statutory withdrawal of a purchase without recorded consent", async () => {
    renderCard(
      licence({
        deliveredAt: DELIVERED_AT,
        refund: { kind: REFUND_ELIGIBILITY.STATUTORY_WITHDRAWAL, until: PERIOD_END },
        withdrawalConsentAt: null,
      }),
    )
    await card()

    expect(detail(labels.details.withdrawalConsent)).toBe(labels.consent.notRecorded)
    expect(detail(labels.details.refund)).toBe(
      t("refund.statutoryWithdrawal", { date: dateTime(PERIOD_END), days: REFUND_TERMS.WITHDRAWAL_DAYS }),
    )
    expect(detail(labels.details.refund)).toContain(`${String(REFUND_TERMS.WITHDRAWAL_DAYS)} days`)
  })

  it("says when the refund period ended", async () => {
    renderCard(licence({ activatedAt: null, refund: { endedAt: PERIOD_END, kind: REFUND_ELIGIBILITY.EXPIRED } }))
    await card()

    expect(detail(labels.details.firstActivation)).toBe(labels.never)
    expect(detail(labels.details.refund)).toBe(t("refund.expired", { date: dateTime(PERIOD_END), days: REFUND_TERMS.WITHDRAWAL_DAYS }))
  })

  it("leaves out the refund terms of a licence that is no longer active", async () => {
    renderCard(licence({ refund: undefined, status: LICENSE_STATUS.REFUNDED }))
    await card()

    expect(detail(labels.details.status)).toBe(labels.status.refunded)
    expect(detail(labels.details.refund)).toBe(labels.refund.inactive)
  })

  it("says so when the account has no licence", async () => {
    renderCard(undefined)

    expect(within(await card()).getByText(labels.none)).toBeTruthy()
    expect(screen.queryByText(labels.details.tier)).toBeNull()
  })

  it("draws a placeholder row for each detail and for the refund, as the card does", async () => {
    renderCard(licence())
    const shown = await card()
    const rows = shown.querySelectorAll("dl > div")
    const { container } = render(<UserLicensePending />)

    expect(rows).toHaveLength(USER_LICENSE_DETAILS.length + 1)
    expect(container.querySelectorAll("[data-slot=card-content] > div > div")).toHaveLength(rows.length)
  })
})
