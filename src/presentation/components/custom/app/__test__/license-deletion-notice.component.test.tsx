import { QueryClient } from "@tanstack/react-query"
import { screen } from "@testing-library/react"
import { createTranslator } from "use-intl"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { LICENSE_STATUS, LICENSE_TIER, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { LicenseDeletionNotice } from "~/src/presentation/components/custom/app/license-deletion-notice"
import { ACCOUNT_DELETION_NOTICES } from "~/src/presentation/components/custom/settings/delete-account-card"

import pricingMessages from "~/messages/en-US/components.custom.pricing.json"
import pagesLicenseMessages from "~/messages/en-US/pages.license.json"
import { ROUTES } from "~/src/routes"

type CurrentLicense = Omit<License["select"], "key">

const messages = getTestMessages("en-US")
const PURCHASED_AT = new Date("2026-11-13T10:00:00Z")
const PLAIN_TAGS = { strong: (chunks: string) => chunks, withdrawal: (chunks: string) => chunks }

const tagged = (tag: string): string =>
  new RegExp(`<${tag}>(?<text>.*)</${tag}>`, "u").exec(pagesLicenseMessages.deletion)?.groups?.["text"] ?? ""

const license = (fields: Partial<CurrentLicense> = {}): CurrentLicense => ({
  activatedAt: null,
  createdAt: PURCHASED_AT,
  deliveredAt: null,
  id: "license-1",
  lessonOpenedAt: null,
  openedLessonId: null,
  polarCustomerId: "customer-1",
  polarLicenseKeyId: "polar-license-1",
  polarOrderId: "order-1",
  purchaseCreatedAt: PURCHASED_AT,
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.COMPLETE,
  updatedAt: PURCHASED_AT,
  userId: "user-1",
  withdrawalConsentAt: null,
  ...fields,
})

const renderNotice = (owned: CurrentLicense | undefined) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(currentLicenseQuery.queryKey, { license: owned })
  return renderWithRouter(
    <IntlProvider locale="en-US" messages={messages} timeZone="UTC">
      <ul>
        <LicenseDeletionNotice />
      </ul>
    </IntlProvider>,
    { queryClient },
  )
}

describe("licence deletion notice", () => {
  it.each(LICENSE_TIERS)("warns that the active %s licence ends with the account and links the withdrawal", (tier) => {
    renderNotice(license({ tier }))
    const tierName = pricingMessages.tiers[tier].name

    const notice = createTranslator({ locale: "en-US", messages: pagesLicenseMessages }).markup("deletion", {
      ...PLAIN_TAGS,
      tier: tierName,
    })

    expect(screen.getByRole("listitem")).toHaveTextContent(notice)
    expect(screen.getByText(tagged("strong").replace("{tier}", tierName), { selector: "strong" })).toBeVisible()
    expect(screen.getByRole("link", { name: tagged("withdrawal") })).toHaveAttribute("href", ROUTES.WITHDRAWAL)
  })

  it.each([
    { owned: license({ status: LICENSE_STATUS.REVOKED }), state: LICENSE_STATUS.REVOKED },
    { owned: license({ status: LICENSE_STATUS.REFUNDED }), state: LICENSE_STATUS.REFUNDED },
    { owned: undefined, state: "absent" },
  ])("says nothing when the licence is $state", ({ owned }) => {
    renderNotice(owned)

    expect(screen.queryByRole("listitem")).not.toBeInTheDocument()
  })
})

describe("licence notice on the account deletion card", () => {
  it("loads the licence the notice reads", async () => {
    const queryClient = new QueryClient()
    vi.spyOn(currentLicenseQuery, "queryFn").mockResolvedValue({ license: undefined })
    const notice = ACCOUNT_DELETION_NOTICES.find(({ Notice }) => Notice === LicenseDeletionNotice)

    await notice?.load({ queryClient })

    expect(queryClient.getQueryData(currentLicenseQuery.queryKey)).toStrictEqual({ license: undefined })
  })
})
