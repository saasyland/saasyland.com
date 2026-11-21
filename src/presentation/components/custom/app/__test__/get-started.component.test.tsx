import { QueryClient, defaultScheduler, notifyManager } from "@tanstack/react-query"
import { act, cleanup, fireEvent, screen, within } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { LICENSE_POLL_MS, LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import { currentLicenseKeyQuery } from "~/src/modules/license/use-cases/get-current-license-key"

import { CLI_SETUP_LINES } from "~/src/data/cli"

import { GetStarted } from "~/src/presentation/components/custom/app/get-started"

import pricingMessages from "~/messages/en-US/components.custom.pricing.json"
import pagesLicenseMessages from "~/messages/en-US/pages.license.json"
import { ROUTES } from "~/src/routes"

const LICENSE_KEY = "SAASY-TEST-KEY-0001"
const { copy, setup } = pagesLicenseMessages

const currentLicenseMock = vi.hoisted(() => vi.fn<() => Promise<{ license: License["select"] | undefined }>>())
const licenseKeyMock = vi.hoisted(() => vi.fn<() => Promise<{ key: string | null | undefined }>>())
const sessionRequest = vi.hoisted(() => vi.fn())
const writeText = vi.fn<(value: string) => Promise<void>>()

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

const confirmedSession = createAuthSessionFixture()

const unconfirmedSession = { ...confirmedSession, user: { ...confirmedSession.user, emailVerified: false } }

const license = (fields: Partial<License["select"]> = {}): License["select"] => ({
  activatedAt: JSON_NULL,
  createdAt: new Date("2026-11-13T10:00:00Z"),
  deliveredAt: JSON_NULL,
  id: "license-1",
  key: LICENSE_KEY,
  polarCustomerId: "customer-1",
  polarLicenseKeyId: "polar-license-1",
  polarOrderId: "order-1",
  purchaseCreatedAt: new Date("2026-11-13T10:00:00Z"),
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.COMPLETE,
  updatedAt: new Date("2026-11-13T10:00:00Z"),
  userId: "user-1",
  withdrawalConsentAt: JSON_NULL,
  ...fields,
})

const renderChecklist = (owned: License["select"] | undefined, session = confirmedSession) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(currentLicenseQuery.queryKey, { license: owned })
  queryClient.setQueryData(currentLicenseKeyQuery.queryKey, { key: session.user.emailVerified ? owned?.key : undefined })
  queryClient.setQueryData(getCurrentSessionQuery.queryKey, session)
  return renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <GetStarted />
    </IntlProvider>,
    { queryClient },
  )
}

const advance = async (milliseconds: number): Promise<void> => {
  await act(() => vi.advanceTimersByTimeAsync(milliseconds))
}

const checklist = () => screen.getByRole("region", { name: setup.title })

const stepStates = () =>
  within(checklist())
    .getAllByRole("listitem")
    .map((item) => within(item).queryByText(setup.done) !== null)

beforeEach(() => {
  vi.useFakeTimers()
  notifyManager.setScheduler(queueMicrotask)
  vi.stubGlobal("navigator", { clipboard: { writeText } })
  writeText.mockReset().mockResolvedValue(undefined)
  currentLicenseMock.mockReset()
  licenseKeyMock.mockReset().mockResolvedValue({ key: LICENSE_KEY })
  sessionRequest.mockReset().mockResolvedValue(confirmedSession)
})

afterEach(() => {
  cleanup()
  notifyManager.setScheduler(defaultScheduler)
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("the steps from a licence to a first project", () => {
  it("marks the purchase done and lists the key and the commands that activate it and generate a project, each to copy", () => {
    renderChecklist(license())

    expect(within(checklist()).getByText(setup.steps.purchase.replace("{tier}", pricingMessages.tiers.complete.name))).toBeVisible()
    expect(screen.getByRole("progressbar", { name: "1 of 4 done" })).toHaveAttribute("aria-valuenow", "1")
    expect(stepStates()).toStrictEqual([true, false, false, false])
    expect(screen.getByText(LICENSE_KEY)).toBeVisible()
    expect(screen.getByRole("button", { name: copy.key })).toBeEnabled()
    for (const { command } of CLI_SETUP_LINES) {
      expect(screen.getByText(command)).toBeVisible()
      expect(screen.getByRole("button", { name: copy.command.replace("{command}", command) })).toBeEnabled()
    }
    expect(within(checklist()).getByRole("link", { name: "Refund Policy" })).toHaveAttribute("href", ROUTES.REFUNDS)
  })

  it("ticks the key once it is copied, then each command once the licence server records it, and stops checking", async () => {
    currentLicenseMock.mockResolvedValue({ license: license() })
    renderChecklist(license())

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: copy.key }))
      await Promise.resolve()
    })
    expect(writeText).toHaveBeenCalledExactlyOnceWith(LICENSE_KEY)
    expect(stepStates()).toStrictEqual([true, true, false, false])

    currentLicenseMock.mockResolvedValue({ license: license({ activatedAt: new Date("2026-11-13T10:05:00Z") }) })
    await advance(LICENSE_POLL_MS.SETUP)
    expect(stepStates()).toStrictEqual([true, true, true, false])

    const done = license({ activatedAt: new Date("2026-11-13T10:05:00Z"), deliveredAt: new Date("2026-11-13T10:07:00Z") })
    currentLicenseMock.mockResolvedValue({ license: done })
    await advance(LICENSE_POLL_MS.SETUP)
    expect(stepStates()).toStrictEqual([true, true, true, true])
    expect(screen.getByRole("progressbar", { name: "4 of 4 done" })).toHaveAttribute("aria-valuenow", "4")

    const calls = currentLicenseMock.mock.calls.length
    const keyCalls = licenseKeyMock.mock.calls.length
    await advance(LICENSE_POLL_MS.SETUP * 2)
    expect(currentLicenseMock).toHaveBeenCalledTimes(calls)
    expect(licenseKeyMock).toHaveBeenCalledTimes(keyCalls)
  })

  it("says the key is on its way and shows it as soon as it is issued", async () => {
    const pending = license({ key: JSON_NULL, polarLicenseKeyId: JSON_NULL })
    currentLicenseMock.mockResolvedValue({ license: pending })
    licenseKeyMock.mockResolvedValue({ key: JSON_NULL })
    renderChecklist(pending)

    expect(within(checklist()).getByText(setup.steps.key.pending)).toBeVisible()
    expect(screen.queryByRole("button", { name: copy.key })).toBeNull()

    currentLicenseMock.mockResolvedValue({ license: license() })
    licenseKeyMock.mockResolvedValue({ key: LICENSE_KEY })
    await advance(LICENSE_POLL_MS.KEY)

    expect(screen.getByText(LICENSE_KEY)).toBeVisible()
    expect(screen.getByRole("button", { name: copy.key })).toBeEnabled()
  })

  it("asks for the confirmed email in the key's step, without the key, while the commands stay listed", () => {
    renderChecklist(license(), unconfirmedSession)

    const keyStep = within(checklist()).getAllByRole("listitem")[1] ?? checklist()
    expect(within(keyStep).getByText(confirmedSession.user.email, { selector: "p > strong" })).toBeVisible()
    expect(
      within(keyStep).getByText((_, element) => element?.tagName === "P" && element.textContent.startsWith("Your key appears here")),
    ).toBeVisible()
    expect(screen.queryByText(LICENSE_KEY)).toBeNull()
    expect(screen.queryByRole("button", { name: copy.key })).toBeNull()
    expect(stepStates()).toStrictEqual([true, false, false, false])
    for (const { command } of CLI_SETUP_LINES) {
      expect(screen.getByRole("button", { name: copy.command.replace("{command}", command) })).toBeEnabled()
    }
  })

  it.each([LICENSE_STATUS.REFUNDED, LICENSE_STATUS.REVOKED])("shows nothing for a %s licence", (status) => {
    const { container } = renderChecklist(license({ status }))

    expect(container).toBeEmptyDOMElement()
  })

  it("shows nothing to an account without a licence", () => {
    const { container } = renderChecklist(undefined)

    expect(container).toBeEmptyDOMElement()
  })
})
