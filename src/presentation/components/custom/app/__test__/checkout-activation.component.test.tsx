import { QueryClient, defaultScheduler, notifyManager } from "@tanstack/react-query"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { ACTIVATION_POLL_MS, ACTIVATION_TIMEOUT_MS, CheckoutActivation } from "~/src/presentation/components/custom/app/checkout-activation"

import pricingMessages from "~/messages/en-US/components.custom.pricing.json"
import pagesLicenseMessages from "~/messages/en-US/pages.license.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"

const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"
const { activation } = pagesLicenseMessages

const currentLicenseMock = vi.hoisted(() => vi.fn<() => Promise<{ license: License["select"] | undefined }>>())

vi.mock(import("~/src/modules/license/use-cases/get-current-license"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, currentLicenseQuery: { ...actual.currentLicenseQuery, queryFn: currentLicenseMock } }
})

const grantedLicense: License["select"] = {
  createdAt: new Date("2026-11-13T10:00:00Z"),
  id: "license-1",
  key: null,
  polarCustomerId: "customer-1",
  polarLicenseKeyId: null,
  polarOrderId: "order-1",
  purchaseCreatedAt: new Date("2026-11-13T10:00:00Z"),
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.COMPLETE,
  updatedAt: new Date("2026-11-13T10:00:00Z"),
  userId: "user-1",
}

const renderActivation = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(currentLicenseQuery.queryKey, { license: undefined })
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <CheckoutActivation checkoutId={CHECKOUT_ID} />
    </IntlProvider>,
    { queryClient },
  )
}

const advance = async (milliseconds: number): Promise<void> => {
  await act(() => vi.advanceTimersByTimeAsync(milliseconds))
}

beforeEach(() => {
  vi.useFakeTimers()
  notifyManager.setScheduler(queueMicrotask)
  currentLicenseMock.mockReset().mockResolvedValue({ license: undefined })
})

afterEach(() => {
  cleanup()
  notifyManager.setScheduler(defaultScheduler)
  vi.useRealTimers()
})

describe("checkout activation", () => {
  it("polls the license until the payment webhook grants it, then thanks the buyer", async () => {
    renderActivation()

    expect(screen.getByRole("status")).toHaveTextContent(activation.activating.title)
    await advance(ACTIVATION_POLL_MS)
    expect(currentLicenseMock).toHaveBeenCalledOnce()

    currentLicenseMock.mockResolvedValue({ license: grantedLicense })
    await advance(ACTIVATION_POLL_MS)

    expect(screen.getByRole("heading", { name: activation.active.title })).toBeVisible()
    expect(screen.getByText(`Thank you for buying ${pricingMessages.tiers.complete.name}.`)).toBeVisible()

    await advance(ACTIVATION_TIMEOUT_MS)
    expect(currentLicenseMock).toHaveBeenCalledTimes(2)
  })

  it("stops polling after the timeout and tells the buyer how to get help", async () => {
    renderActivation()

    await advance(ACTIVATION_TIMEOUT_MS)

    expect(screen.getByRole("heading", { name: activation.delayed.title })).toBeVisible()
    expect(screen.getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
    expect(screen.getByText(CHECKOUT_ID)).toBeVisible()
    const polls = currentLicenseMock.mock.calls.length
    expect(polls).toBe(ACTIVATION_TIMEOUT_MS / ACTIVATION_POLL_MS)

    await advance(ACTIVATION_TIMEOUT_MS)
    expect(currentLicenseMock).toHaveBeenCalledTimes(polls)
  })

  it("checks again on request and shows the license once it has arrived", async () => {
    renderActivation()
    await advance(ACTIVATION_TIMEOUT_MS)
    const check = Promise.withResolvers<{ license: License["select"] }>()
    currentLicenseMock.mockReturnValue(check.promise)

    act(() => {
      fireEvent.click(screen.getByRole("button", { name: activation.delayed.retry }))
    })
    await advance(0)

    expect(screen.getByRole("button", { name: (name) => name.endsWith(activation.delayed.retry) })).toBeDisabled()
    await act(async () => {
      check.resolve({ license: grantedLicense })
      await check.promise
    })
    expect(screen.getByRole("heading", { name: activation.active.title })).toBeVisible()
  })
})
