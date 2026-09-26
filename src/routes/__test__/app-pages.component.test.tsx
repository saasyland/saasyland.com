import type { ReactElement } from "react"

import { QueryClient } from "@tanstack/react-query"
import { act, cleanup, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { LICENSE_MUTATION_KEYS, LICENSE_QUERY_KEYS, LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import type { deactivateLicenseMutation } from "~/src/modules/license/use-cases/deactivate-license"
import {
  currentLicenseQuery,
  type getCurrentLicenseActivations,
  licenseActivationsQuery,
} from "~/src/modules/license/use-cases/get-current-license"
import type { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"

import { Route as OverviewRoute } from "~/src/routes/app.index"
import { Route as LicenseRoute } from "~/src/routes/app.license"

import { LicenseCard } from "~/src/presentation/components/custom/app/license-card"
import { LicenseStatusCard } from "~/src/presentation/components/custom/app/license-status-card"

import errorsMessages from "~/messages/en-US/errors.json"
import pagesAppMessages from "~/messages/en-US/pages.app.json"
import pagesLicenseMessages from "~/messages/en-US/pages.license.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const messages = getTestMessages("en-US")
const LICENSE_KEY = "private-purchased-license-key"
const Overview = OverviewRoute.options.component
const LicensePage = LicenseRoute.options.component

if (Overview === undefined || LicensePage === undefined) {
  throw new Error("App routes must have page components")
}

const currentLicenseMock = vi.hoisted(() => vi.fn<() => Promise<{ license: License["select"] | undefined }>>())
const activationsMock = vi.hoisted(() => vi.fn<() => ReturnType<typeof getCurrentLicenseActivations>>())
const checkoutMock = vi.hoisted(() => vi.fn<NonNullable<typeof startCheckoutMutation.mutationFn>>())
const deactivateMock = vi.hoisted(() => vi.fn<NonNullable<typeof deactivateLicenseMutation.mutationFn>>())

vi.mock(import("~/src/modules/license/use-cases/get-current-license"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    currentLicenseQuery: { ...actual.currentLicenseQuery, queryFn: currentLicenseMock },
    licenseActivationsQuery: { ...actual.licenseActivationsQuery, queryFn: activationsMock },
  }
})
vi.mock(import("~/src/modules/license/use-cases/start-checkout"), () => ({
  startCheckoutMutation: { mutationFn: checkoutMock, mutationKey: LICENSE_MUTATION_KEYS.START_CHECKOUT },
}))
vi.mock(import("~/src/modules/license/use-cases/deactivate-license"), () => ({
  deactivateLicenseMutation: { mutationFn: deactivateMock, mutationKey: LICENSE_MUTATION_KEYS.DEACTIVATE },
}))

const ownedLicense: License["select"] = {
  createdAt: new Date("2026-09-08T10:00:00Z"),
  id: "license-1",
  key: LICENSE_KEY,
  polarCustomerId: "customer-1",
  polarLicenseKeyId: "polar-license-1",
  polarOrderId: "order-1",
  purchaseCreatedAt: new Date(0),
  status: LICENSE_STATUS.ACTIVE,
  tier: LICENSE_TIER.AGENCY,
  updatedAt: new Date("2026-09-08T10:00:00Z"),
  userId: "user-1",
}

const renderPage = (page: ReactElement, license?: License["select"]) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(currentLicenseQuery.queryKey, { license })
  queryClient.setQueryData(licenseActivationsQuery.queryKey, { activations: [], limitActivations: 2 })
  currentLicenseMock.mockResolvedValue({ license })
  activationsMock.mockResolvedValue({ activations: [], limitActivations: 2 })
  const { container } = renderWithRouter(
    <IntlProvider locale="en-US" messages={messages} timeZone="UTC">
      {page}
    </IntlProvider>,
    { queryClient },
  )
  return { container, queryClient, user: userEvent.setup() }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(toast, "error").mockReturnValue(0)
  vi.spyOn(toast, "success").mockReturnValue(0)
})

afterEach(cleanup)

describe("app overview", () => {
  it("offers the available packages and useful resources to an account without a license", () => {
    renderPage(<Overview />)

    expect(screen.getByRole("heading", { level: 1, name: pagesAppMessages.metadata.title })).toBeVisible()
    expect(screen.getByRole("heading", { name: pagesLicenseMessages.buy.title })).toBeVisible()
    expect(screen.getByRole("button", { name: pagesLicenseMessages.buy.core })).toBeEnabled()
    expect(screen.getByRole("button", { name: pagesLicenseMessages.buy.complete })).toBeEnabled()
    expect(screen.getByRole("button", { name: pagesLicenseMessages.buy.agency })).toBeEnabled()
    expect(screen.getByRole("link", { name: pagesAppMessages.overview.docs.action })).toHaveAttribute("href", ROUTES.DOCS)
    expect(screen.getByRole("link", { name: pagesAppMessages.overview.support.action })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
    expect(screen.queryByRole("link", { name: pagesAppMessages.license })).not.toBeInTheDocument()
  })

  it.each([
    { license: ownedLicense, status: pagesAppMessages.overview.license.active },
    { license: { ...ownedLicense, key: JSON_NULL }, status: pagesAppMessages.overview.license.pending },
    {
      license: { ...ownedLicense, key: JSON_NULL, status: LICENSE_STATUS.REVOKED },
      status: pagesAppMessages.overview.license.revoked,
    },
  ])("shows the actual purchased tier and $status state without revealing the key", ({ license, status }) => {
    renderPage(<Overview />, license)

    expect(screen.getByText(pagesLicenseMessages.tier.agency)).toBeVisible()
    expect(screen.getByText(status)).toBeVisible()
    expect(screen.getByRole("link", { name: pagesAppMessages.license })).toHaveAttribute("href", ROUTES.APP_LICENSE)
    expect(screen.queryByText(LICENSE_KEY)).not.toBeInTheDocument()
    expect(screen.queryByRole("heading", { name: pagesLicenseMessages.buy.title })).not.toBeInTheDocument()
  })

  it("submits the selected package once, prevents duplicate checkout, and recovers after a failure", async () => {
    const checkout = Promise.withResolvers<{ url: string }>()
    checkoutMock.mockReturnValue(checkout.promise)
    const { user } = renderPage(<Overview />)

    await user.click(screen.getByRole("button", { name: pagesLicenseMessages.buy.agency }))

    expect(checkoutMock).toHaveBeenCalledExactlyOnceWith({ tier: LICENSE_TIER.AGENCY }, expect.anything())
    const pendingButtons = screen.getAllByRole("button", { name: (name) => name.endsWith(pagesLicenseMessages.buy.pending) })
    expect(pendingButtons).toHaveLength(3)
    for (const button of pendingButtons) {
      expect(button).toBeDisabled()
      await user.click(button)
    }
    expect(checkoutMock).toHaveBeenCalledOnce()

    await act(async () => {
      checkout.reject(new Error("Checkout unavailable"))
      await checkout.promise.catch(() => {})
    })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: pagesLicenseMessages.buy.agency })).toBeEnabled()
    })
    expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
  })

  it("refreshes license data before opening the successful checkout URL", async () => {
    checkoutMock.mockResolvedValue({ url: "#checkout" })
    const { queryClient, user } = renderPage(<Overview />)
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")
    await user.click(screen.getByRole("button", { name: pagesLicenseMessages.buy.core }))
    await waitFor(() => {
      expect(globalThis.location.hash).toBe("#checkout")
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LICENSE_QUERY_KEYS.ALL })
    expect(checkoutMock).toHaveBeenCalledExactlyOnceWith({ tier: LICENSE_TIER.CORE }, expect.anything())
    globalThis.history.replaceState({}, "", "/")
  })
})

describe("license cards", () => {
  it.each([
    ["license card", LicenseCard],
    ["license status card", LicenseStatusCard],
  ] as const)("renders no %s for an account without a license", (_, Card) => {
    const { container } = renderPage(<Card />)

    expect(container).toBeEmptyDOMElement()
  })

  it.each([
    ["license card", LicenseCard, pagesLicenseMessages.tier.agency],
    ["license status card", LicenseStatusCard, pagesAppMessages.overview.license.title],
  ] as const)("renders the %s once the account owns a license", (_, Card, heading) => {
    renderPage(<Card />, ownedLicense)

    expect(screen.getByRole("heading", { name: heading })).toBeVisible()
  })
})

describe("license page", () => {
  it("keeps its page heading and description when there is no purchase yet", () => {
    renderPage(<LicensePage />)

    expect(screen.getByRole("heading", { level: 1, name: pagesLicenseMessages.metadata.title })).toBeVisible()
    expect(screen.getByText(pagesLicenseMessages.metadata.description)).toBeVisible()
    expect(screen.getByRole("heading", { name: pagesLicenseMessages.buy.title })).toBeVisible()
  })

  it("shows the purchased key and refreshes the machine list after freeing a slot", async () => {
    deactivateMock.mockResolvedValue({ deactivated: true })
    const { queryClient, user } = renderPage(<LicensePage />, ownedLicense)
    act(() => {
      queryClient.setQueryData(licenseActivationsQuery.queryKey, {
        activations: [
          {
            createdAt: new Date("2026-09-08T10:00:00Z"),
            id: "activation-1",
            label: "Development laptop",
            licenseKeyId: "polar-license-1",
            meta: {},
            modifiedAt: JSON_NULL,
          },
        ],
        limitActivations: 2,
      })
    })

    expect(screen.getByText(LICENSE_KEY)).toBeVisible()
    expect(screen.getByRole("link", { name: pagesLicenseMessages.manage })).toHaveAttribute("href", ROUTES.API_AUTH_CUSTOMER_PORTAL)
    expect(await screen.findByText("Development laptop")).toBeVisible()
    await user.click(screen.getByRole("button", { name: pagesLicenseMessages.activations.deactivate }))

    expect(deactivateMock).toHaveBeenCalledExactlyOnceWith({ activationId: "activation-1" }, expect.anything())
    await waitFor(() => {
      expect(screen.queryByText("Development laptop")).not.toBeInTheDocument()
    })
    expect(activationsMock).toHaveBeenCalledOnce()
    expect(screen.getByText(pagesLicenseMessages.activations.none)).toBeVisible()
    expect(toast.success).toHaveBeenCalledWith(pagesLicenseMessages.activations.success)
  })

  it("shows revoked and pending licenses honestly, without a machine list before provisioning", () => {
    renderPage(<LicensePage />, { ...ownedLicense, key: JSON_NULL, polarLicenseKeyId: JSON_NULL, status: LICENSE_STATUS.REVOKED })
    expect(screen.getByText(pagesLicenseMessages.revoked)).toBeVisible()
    expect(screen.getByText(pagesLicenseMessages.pending)).toBeVisible()
    expect(screen.queryByRole("heading", { name: pagesLicenseMessages.activations.title })).not.toBeInTheDocument()
  })

  it("supports unlimited activations and keeps the machine when deactivation fails", async () => {
    const request = Promise.withResolvers<{ deactivated: true }>()
    deactivateMock.mockReturnValueOnce(request.promise)
    const { queryClient, user } = renderPage(<LicensePage />, ownedLicense)
    act(() => {
      queryClient.setQueryData(licenseActivationsQuery.queryKey, {
        activations: [
          {
            createdAt: new Date("2026-09-08T10:00:00Z"),
            id: "activation-2",
            label: "Workstation",
            licenseKeyId: "polar-license-1",
            meta: {},
            modifiedAt: JSON_NULL,
          },
        ],
        limitActivations: JSON_NULL,
      })
    })
    expect(await screen.findByText("Workstation")).toBeVisible()
    expect(screen.getByText("1 in use")).toBeVisible()
    await user.click(screen.getByRole("button", { name: pagesLicenseMessages.activations.deactivate }))
    expect(screen.getByRole("button", { name: (name) => name.endsWith(pagesLicenseMessages.activations.deactivating) })).toBeDisabled()
    await act(async () => {
      request.reject(new Error("Deactivation unavailable"))
      await request.promise.catch(() => {})
    })
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
    })
    expect(screen.getByText("Workstation")).toBeVisible()
    expect(screen.getByRole("button", { name: pagesLicenseMessages.activations.deactivate })).toBeEnabled()
    expect(activationsMock).not.toHaveBeenCalled()
  })
})
