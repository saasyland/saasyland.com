import { QueryClient, defaultScheduler, notifyManager } from "@tanstack/react-query"
import { act, cleanup, fireEvent, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { LICENSE_STATUS, LICENSE_TIER, type LicenseTier } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import { currentLicenseKeyQuery } from "~/src/modules/license/use-cases/get-current-license-key"

import { ACTIVATION_POLL_MS, ACTIVATION_TIMEOUT_MS, CheckoutActivation } from "~/src/presentation/components/custom/app/checkout-activation"

import pricingMessages from "~/messages/en-US/components.custom.pricing.json"
import pagesLicenseMessages from "~/messages/en-US/pages.license.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"

const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"
const { activation } = pagesLicenseMessages

const currentLicenseMock = vi.hoisted(() => vi.fn<() => Promise<{ license: License["select"] | undefined }>>())
const licenseKeyMock = vi.hoisted(() => vi.fn<() => Promise<{ key: string | null | undefined }>>())
const sessionRequest = vi.hoisted(() => vi.fn())
const triggerConfettiMock = vi.hoisted(() => vi.fn<() => void>())

vi.mock(import("~/src/modules/license/use-cases/get-current-license"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    currentLicenseQuery: { ...actual.currentLicenseQuery, queryFn: currentLicenseMock },
    licenseSetupQuery: { ...actual.licenseSetupQuery, queryFn: currentLicenseMock },
  }
})
vi.mock(import("~/src/modules/license/use-cases/get-current-license-key"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    currentLicenseKeyQuery: { ...actual.currentLicenseKeyQuery, queryFn: licenseKeyMock },
    licenseKeySetupQuery: { ...actual.licenseKeySetupQuery, queryFn: licenseKeyMock },
  }
})
vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})
vi.mock(import("~/src/lib/confetti"), () => ({ triggerConfetti: triggerConfettiMock }))

const session = createAuthSessionFixture()

const grantedLicense: License["select"] = {
  activatedAt: null,
  createdAt: new Date("2026-11-13T10:00:00Z"),
  deliveredAt: null,
  id: "license-1",
  key: null,
  lessonOpenedAt: null,
  openedLessonId: null,
  polarCustomerId: "customer-1",
  polarLicenseKeyId: null,
  polarOrderId: "order-1",
  purchaseCreatedAt: new Date("2026-11-13T10:00:00Z"),
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.COMPLETE,
  updatedAt: new Date("2026-11-13T10:00:00Z"),
  userId: "user-1",
  withdrawalConsentAt: null,
}

const SERVER_CLOCK_AHEAD_MS = 300_000

interface ActivationRender {
  readonly path?: string
  readonly serverReadAt?: number
  readonly tier?: LicenseTier | undefined
}

const renderActivation = (options: ActivationRender = {}) => {
  const { path = "/app", serverReadAt = Date.now() } = options
  const tier = "tier" in options ? options.tier : LICENSE_TIER.COMPLETE
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(currentLicenseQuery.queryKey, { license: undefined }, { updatedAt: serverReadAt })
  queryClient.setQueryData(currentLicenseKeyQuery.queryKey, { key: undefined })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <CheckoutActivation checkoutId={CHECKOUT_ID} tier={tier} />
    </IntlProvider>,
    { queryClient, router: createTestRouter(path) },
  )
}

const advance = async (milliseconds: number): Promise<void> => {
  await act(() => vi.advanceTimersByTimeAsync(milliseconds))
}

beforeEach(() => {
  vi.useFakeTimers()
  notifyManager.setScheduler(queueMicrotask)
  currentLicenseMock.mockReset().mockResolvedValue({ license: undefined })
  licenseKeyMock.mockReset().mockResolvedValue({ key: JSON_NULL })
  sessionRequest.mockReset().mockResolvedValue(session)
  triggerConfettiMock.mockReset()
})

afterEach(() => {
  cleanup()
  notifyManager.setScheduler(defaultScheduler)
  vi.useRealTimers()
})

describe("checkout activation", () => {
  it("polls the license until the payment webhook grants it, then celebrates once and shows the first steps", async () => {
    renderActivation()

    expect(screen.getByRole("status")).toHaveTextContent(activation.activating.title)
    await advance(ACTIVATION_POLL_MS)
    expect(currentLicenseMock).toHaveBeenCalledOnce()
    expect(triggerConfettiMock).not.toHaveBeenCalled()

    currentLicenseMock.mockResolvedValue({ license: grantedLicense })
    await advance(ACTIVATION_POLL_MS)

    expect(screen.getByRole("heading", { name: activation.active.title })).toBeVisible()
    expect(screen.getByText(activation.active.body.replace("{tier}", pricingMessages.tiers.complete.name))).toBeVisible()
    expect(screen.queryByRole("link", { name: activation.active.continue })).toBeNull()
    expect(screen.getByRole("region", { name: pagesLicenseMessages.setup.title })).toBeVisible()
    expect(triggerConfettiMock).toHaveBeenCalledOnce()

    currentLicenseMock.mockResolvedValue({
      license: { ...grantedLicense, activatedAt: new Date(), deliveredAt: new Date(), key: "SAASY-KEY", polarLicenseKeyId: "key-1" },
    })
    licenseKeyMock.mockResolvedValue({ key: "SAASY-KEY" })
    await advance(ACTIVATION_TIMEOUT_MS)
    const polls = currentLicenseMock.mock.calls.length
    await advance(ACTIVATION_TIMEOUT_MS)
    expect(currentLicenseMock).toHaveBeenCalledTimes(polls)
    expect(triggerConfettiMock).toHaveBeenCalledOnce()
  })

  it("keeps waiting after an upgrade until the licence reaches the tier being bought, never thanking the buyer for the old one", async () => {
    const thanks = (tier: keyof typeof pricingMessages.tiers) => activation.active.body.replace("{tier}", pricingMessages.tiers[tier].name)
    currentLicenseMock.mockResolvedValue({ license: { ...grantedLicense, tier: LICENSE_TIER.CORE } })
    renderActivation({ tier: LICENSE_TIER.COMPLETE })

    await advance(ACTIVATION_POLL_MS)
    await advance(ACTIVATION_POLL_MS)

    expect(screen.getByRole("status")).toHaveTextContent(activation.activating.title)
    expect(screen.queryByText(thanks(LICENSE_TIER.CORE))).toBeNull()
    expect(triggerConfettiMock).not.toHaveBeenCalled()

    currentLicenseMock.mockResolvedValue({ license: grantedLicense })
    await advance(ACTIVATION_POLL_MS)

    expect(screen.getByRole("heading", { name: activation.active.title })).toBeVisible()
    expect(screen.getByText(thanks(LICENSE_TIER.COMPLETE))).toBeVisible()
    expect(triggerConfettiMock).toHaveBeenCalledOnce()
  })

  it("confirms a return that names no tier as soon as the licence is active", async () => {
    currentLicenseMock.mockResolvedValue({ license: { ...grantedLicense, tier: LICENSE_TIER.CORE } })
    renderActivation({ tier: undefined })

    await advance(ACTIVATION_POLL_MS)

    expect(screen.getByText(activation.active.body.replace("{tier}", pricingMessages.tiers.core.name))).toBeVisible()
  })

  it("offers the way back to the page the buyer came from once the licence is active", async () => {
    const lesson = "/courses/the-walkthrough/billing"
    renderActivation({ path: `/app?checkoutId=${CHECKOUT_ID}&redirect=${encodeURIComponent(lesson)}` })
    currentLicenseMock.mockResolvedValue({ license: grantedLicense })

    await advance(ACTIVATION_POLL_MS)

    expect(screen.getByRole("link", { name: activation.active.continue })).toHaveAttribute("href", lesson)
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

  it("waits the whole timeout on the browser's own timer when the server's clock runs ahead of it", async () => {
    renderActivation({ serverReadAt: Date.now() + SERVER_CLOCK_AHEAD_MS })

    expect(screen.getByRole("status")).toHaveTextContent(activation.activating.title)
    await advance(ACTIVATION_TIMEOUT_MS - ACTIVATION_POLL_MS)
    expect(screen.getByRole("status")).toHaveTextContent(activation.activating.title)

    await advance(ACTIVATION_POLL_MS)
    expect(screen.getByRole("heading", { name: activation.delayed.title })).toBeVisible()
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
