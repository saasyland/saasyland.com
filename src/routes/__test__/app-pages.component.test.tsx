import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRoute, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { AriaProvider } from "~/src/providers/aria-provider"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { COURSE_KIND } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { LICENSE_MUTATION_KEYS, LICENSE_QUERY_KEYS, LICENSE_STATUS, LICENSE_TIER } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import type { deactivateLicenseMutation } from "~/src/modules/license/use-cases/deactivate-license"
import { currentLicenseQuery, type getCurrentLicenseActivations } from "~/src/modules/license/use-cases/get-current-license"
import type { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"

import { Route as AppRoute } from "~/src/routes/app"
import { Route as OverviewRoute } from "~/src/routes/app.index"
import { Route as LicenseRoute } from "~/src/routes/app.license"

import { LicenseCard } from "~/src/presentation/components/custom/app/license-card"
import { LicenseStatusCard } from "~/src/presentation/components/custom/app/license-status-card"

import pricingMessages from "~/messages/en-US/components.custom.pricing.json"
import errorsMessages from "~/messages/en-US/errors.json"
import pagesAppMessages from "~/messages/en-US/pages.app.json"
import pagesLicenseMessages from "~/messages/en-US/pages.license.json"
import plPricingMessages from "~/messages/pl-PL/components.custom.pricing.json"
import plPagesLicenseMessages from "~/messages/pl-PL/pages.license.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

const LICENSE_KEY = "private-purchased-license-key"
const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"
const { activation, buy, chosen, unlocks } = pagesLicenseMessages

const sessionRequest = vi.hoisted(() => vi.fn())
const currentLicenseMock = vi.hoisted(() => vi.fn<() => Promise<{ license: License["select"] | undefined }>>())
const activationsMock = vi.hoisted(() => vi.fn<() => ReturnType<typeof getCurrentLicenseActivations>>())
const catalogueMock = vi.hoisted(() => vi.fn<() => Promise<Course["catalogue"]>>())
const checkoutMock = vi.hoisted(() => vi.fn<NonNullable<typeof startCheckoutMutation.mutationFn>>())
const deactivateMock = vi.hoisted(() => vi.fn<NonNullable<typeof deactivateLicenseMutation.mutationFn>>())

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})
vi.mock(import("~/src/modules/license/use-cases/get-current-license"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    currentLicenseQuery: { ...actual.currentLicenseQuery, queryFn: currentLicenseMock },
    licenseActivationsQuery: { ...actual.licenseActivationsQuery, queryFn: activationsMock },
  }
})
vi.mock(import("~/src/modules/course/use-cases/get-catalogue"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, catalogueQuery: (input) => ({ ...actual.catalogueQuery(input), queryFn: catalogueMock }) }
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

const CATALOGUE: Course["catalogue"] = [
  {
    durationMs: 375_000,
    id: "walkthrough",
    kind: COURSE_KIND.COURSE,
    lessons: 4,
    paid: 2,
    previews: 1,
    slug: "the-walkthrough",
    summary: "How it works.",
    title: "The walkthrough",
  },
  {
    durationMs: 120_000,
    id: "deploy",
    kind: COURSE_KIND.TUTORIAL,
    lessons: 2,
    paid: 1,
    previews: 1,
    slug: "deploy",
    summary: "Ship it.",
    title: "Deploying to Workers",
  },
  {
    durationMs: 0,
    id: "free",
    kind: COURSE_KIND.TUTORIAL,
    lessons: 1,
    paid: 0,
    previews: 1,
    slug: "free",
    summary: "Free.",
    title: "Free tutorial",
  },
]

const renderApp = async (path: string, locale: SupportedLocale = "en-US") => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false } } })
  const root = createRootRouteWithContext<RouterContext>()({
    component: () => (
      <AriaProvider>
        <Outlet />
      </AriaProvider>
    ),
  })
  Object.assign(AppRoute.options, { getParentRoute: () => root, id: "/app", path: "/app" })
  Object.assign(OverviewRoute.options, { getParentRoute: () => AppRoute, id: "/", path: "/" })
  Object.assign(LicenseRoute.options, { getParentRoute: () => AppRoute, id: "/license", path: "/license" })
  const terms = createRoute({ component: () => <h1>Terms</h1>, getParentRoute: () => root, path: ROUTES.TERMS })
  const router = createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree: root.addChildren([terms, AppRoute.addChildren([OverviewRoute, LicenseRoute])]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { queryClient, router, user: userEvent.setup() }
}

const offer = () => screen.findByRole("region", { name: buy.title })

const tierButton = (tier: keyof typeof pricingMessages.tiers) => screen.getByRole("button", { name: pricingMessages.tiers[tier].cta })

beforeEach(() => {
  sessionRequest.mockReset().mockResolvedValue(createAuthSessionFixture())
  currentLicenseMock.mockReset().mockResolvedValue({ license: undefined })
  activationsMock.mockReset().mockResolvedValue({ activations: [], limitActivations: 2 })
  catalogueMock.mockReset().mockResolvedValue(CATALOGUE)
  checkoutMock.mockReset()
  deactivateMock.mockReset()
  vi.spyOn(toast, "error").mockReturnValue(0)
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {})
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      addEventListener: vi.fn(),
      addListener: vi.fn(),
      matches: false,
      media: query,
      removeEventListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe("buying a license", () => {
  it.each([ROUTES.APP, ROUTES.APP_LICENSE])("offers every tier with its price and features on %s", async (path) => {
    await renderApp(path)

    const region = await offer()
    for (const tier of Object.values(pricingMessages.tiers)) {
      expect(within(region).getByRole("heading", { level: 3, name: tier.name })).toBeVisible()
      expect(within(region).getByRole("button", { name: tier.cta })).toBeEnabled()
      expect(within(region).getByText(tier.features.f1)).toBeVisible()
    }
    expect(within(region).getAllByText(pricingMessages.mostPopular)).toHaveLength(1)
    expect(within(region).getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", ROUTES.TERMS)
    expect(screen.queryByRole("region", { name: chosen.title.replace("{tier}", pricingMessages.tiers.complete.name) })).toBeNull()
  })

  it("shows what Complete and Agency unlock in the courses, counted from the catalogue", async () => {
    await renderApp(ROUTES.APP_LICENSE)

    const courses = await screen.findByRole("region", { name: "Courses included with Complete and Agency" })
    expect(within(courses).getByText("Your account cannot open 3 lessons in 2 courses yet.")).toBeVisible()
    expect(within(courses).getByRole("link", { name: /The walkthrough\s*2 locked lessons/u })).toHaveAttribute(
      "href",
      "/courses/the-walkthrough",
    )
    expect(within(courses).getByRole("link", { name: /Deploying to Workers\s*1 locked lesson$/u })).toHaveAttribute(
      "href",
      "/courses/deploy",
    )
    expect(within(courses).queryByRole("link", { name: /Free tutorial/u })).toBeNull()
  })

  it("names the course tiers in the visitor's language", async () => {
    await renderApp(ROUTES.APP_LICENSE, "pl-PL")

    expect(
      await screen.findByRole("region", {
        name: `Kursy w pakietach ${plPricingMessages.tiers.complete.name} i ${plPricingMessages.tiers.agency.name}`,
      }),
    ).toBeVisible()
  })

  it("leaves the course block out while no course has a paid lesson", async () => {
    catalogueMock.mockResolvedValue(CATALOGUE.filter(({ paid }) => paid === 0))
    await renderApp(ROUTES.APP_LICENSE)

    await offer()
    expect(screen.queryByRole("region", { name: /Courses included/u })).toBeNull()
  })

  it("starts one checkout in the page's language and locks every tier until it opens or fails", async () => {
    const checkout = Promise.withResolvers<{ url: string }>()
    checkoutMock.mockReturnValue(checkout.promise)
    vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/pl-PL/app/license"))
    const { user } = await renderApp(ROUTES.APP_LICENSE, "pl-PL")
    const region = await screen.findByRole("region", { name: plPagesLicenseMessages.buy.title })

    await user.click(within(region).getByRole("button", { name: plPricingMessages.tiers.agency.cta }))

    expect(checkoutMock).toHaveBeenCalledExactlyOnceWith({ locale: "pl-PL", tier: LICENSE_TIER.AGENCY }, expect.anything())
    const buttons = within(region).getAllByRole("button")
    expect(buttons).toHaveLength(Object.keys(plPricingMessages.tiers).length)
    for (const button of buttons) {
      expect(button).toBeDisabled()
    }
    await act(async () => {
      checkout.reject(new Error("Checkout unavailable"))
      await checkout.promise.catch(() => {})
    })

    await waitFor(() => {
      expect(screen.getByRole("button", { name: plPricingMessages.tiers.agency.cta })).toBeEnabled()
    })
    expect(checkoutMock).toHaveBeenCalledOnce()
  })

  it("shows the pending label on the pressed tier only and recovers after a failure", async () => {
    const checkout = Promise.withResolvers<{ url: string }>()
    checkoutMock.mockReturnValue(checkout.promise)
    const { user } = await renderApp(ROUTES.APP)
    await offer()

    await user.click(tierButton(LICENSE_TIER.CORE))

    expect(screen.getByRole("button", { name: (name) => name.endsWith(buy.pending) })).toBeDisabled()
    expect(tierButton(LICENSE_TIER.COMPLETE)).toBeDisabled()
    await user.click(tierButton(LICENSE_TIER.COMPLETE))
    expect(checkoutMock).toHaveBeenCalledOnce()

    await act(async () => {
      checkout.reject(new Error("Checkout unavailable"))
      await checkout.promise.catch(() => {})
    })

    await waitFor(() => {
      expect(tierButton(LICENSE_TIER.CORE)).toBeEnabled()
    })
    expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.INTERNAL_ERROR)
  })

  it("refreshes the license before opening the checkout", async () => {
    checkoutMock.mockResolvedValue({ url: "#checkout" })
    const { queryClient, user } = await renderApp(ROUTES.APP)
    await offer()
    const invalidate = vi.spyOn(queryClient, "invalidateQueries")

    await user.click(tierButton(LICENSE_TIER.CORE))

    await waitFor(() => {
      expect(globalThis.location.hash).toBe("#checkout")
    })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: LICENSE_QUERY_KEYS.ALL })
    expect(checkoutMock).toHaveBeenCalledExactlyOnceWith({ locale: "en-US", tier: LICENSE_TIER.CORE }, expect.anything())
    globalThis.history.replaceState({}, "", "/")
  })

  it("explains a refused checkout and switches a stale page to the license it already owns", async () => {
    checkoutMock.mockRejectedValue(new AppError(ERROR_CODES.LICENSE_ALREADY_ACTIVE))
    const { user } = await renderApp(ROUTES.APP)
    await offer()
    currentLicenseMock.mockResolvedValue({ license: ownedLicense })

    await user.click(tierButton(LICENSE_TIER.COMPLETE))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errorsMessages.codes.LICENSE_ALREADY_ACTIVE)
    })
    expect(await screen.findByRole("heading", { name: pagesAppMessages.overview.license.title })).toBeVisible()
    expect(screen.queryByRole("region", { name: buy.title })).toBeNull()
  })
})

describe("a tier chosen on the pricing page", () => {
  it.each([ROUTES.APP, ROUTES.APP_LICENSE])("is highlighted on %s and goes to checkout in one press", async (path) => {
    checkoutMock.mockReturnValue(new Promise(() => {}))
    const { user } = await renderApp(`${path}?tier=${LICENSE_TIER.COMPLETE}`)

    const card = await screen.findByRole("region", { name: `Continue with ${pricingMessages.tiers.complete.name}` })
    expect(within(card).getByText(`You chose ${pricingMessages.tiers.complete.name}`, { exact: false })).toBeVisible()
    expect(within(card).getByText("$399", { selector: ".pv-100" })).toBeInTheDocument()

    await user.click(within(card).getByRole("button", { name: chosen.continue }))

    expect(checkoutMock).toHaveBeenCalledExactlyOnceWith({ locale: "en-US", tier: LICENSE_TIER.COMPLETE }, expect.anything())
  })

  it("ignores a tier the app does not sell", async () => {
    await renderApp(`${ROUTES.APP}?tier=enterprise`)

    await offer()
    expect(screen.queryByRole("button", { name: chosen.continue })).toBeNull()
  })

  it("is not offered to an account that already owns a license", async () => {
    currentLicenseMock.mockResolvedValue({ license: ownedLicense })
    await renderApp(`${ROUTES.APP}?tier=${LICENSE_TIER.COMPLETE}`)

    expect(await screen.findByRole("heading", { name: pagesAppMessages.overview.license.title })).toBeVisible()
    expect(screen.queryByRole("button", { name: chosen.continue })).toBeNull()
    expect(screen.queryByRole("region", { name: buy.title })).toBeNull()
  })
})

describe("returning from checkout", () => {
  it("says the payment arrived and keeps the buy buttons away while the license activates", async () => {
    await renderApp(`${ROUTES.APP}?checkoutId=${CHECKOUT_ID}`)

    expect(await screen.findByRole("heading", { name: activation.activating.title })).toBeVisible()
    expect(screen.getByRole("status")).toHaveTextContent(activation.activating.body)
    expect(screen.queryByRole("region", { name: buy.title })).toBeNull()
  })

  it("thanks the buyer once the license is active and shows it", async () => {
    currentLicenseMock.mockResolvedValue({ license: { ...ownedLicense, key: JSON_NULL } })
    await renderApp(`${ROUTES.APP_LICENSE}?checkoutId=${CHECKOUT_ID}`)

    expect(await screen.findByRole("heading", { name: activation.active.title })).toBeVisible()
    expect(screen.getByText(`Thank you for buying ${pricingMessages.tiers.agency.name}.`)).toBeVisible()
    expect(screen.getByRole("heading", { name: pricingMessages.tiers.agency.name })).toBeVisible()
    expect(screen.getByText(pagesLicenseMessages.pending)).toBeVisible()
  })

  it("hides a refunded license while its replacement activates", async () => {
    currentLicenseMock.mockResolvedValue({ license: { ...ownedLicense, status: LICENSE_STATUS.REVOKED } })
    await renderApp(`${ROUTES.APP_LICENSE}?checkoutId=${CHECKOUT_ID}`)

    expect(await screen.findByRole("heading", { name: activation.activating.title })).toBeVisible()
    expect(screen.queryByText(pagesLicenseMessages.revoked)).toBeNull()
  })

  it("ignores a checkout reference that is not a Polar checkout id", async () => {
    await renderApp(`${ROUTES.APP}?checkoutId=not-a-checkout`)

    await offer()
    expect(screen.queryByRole("heading", { name: activation.activating.title })).toBeNull()
  })
})

describe("owning a license", () => {
  it.each([
    { license: ownedLicense, status: pagesAppMessages.overview.license.active },
    { license: { ...ownedLicense, key: JSON_NULL }, status: pagesAppMessages.overview.license.pending },
  ])("shows the purchased tier and $status state on the overview without the key or the offer", async ({ license, status }) => {
    currentLicenseMock.mockResolvedValue({ license })
    await renderApp(ROUTES.APP)

    expect(await screen.findByText(pricingMessages.tiers.agency.name)).toBeVisible()
    expect(screen.getByText(status)).toBeVisible()
    expect(screen.getByRole("link", { name: pagesAppMessages.license })).toHaveAttribute("href", ROUTES.APP_LICENSE)
    expect(screen.queryByText(LICENSE_KEY)).toBeNull()
    expect(screen.queryByRole("region", { name: buy.title })).toBeNull()
    expect(screen.getByRole("link", { name: pagesAppMessages.overview.docs.action })).toHaveAttribute("href", ROUTES.DOCS)
  })

  it("offers a new license next to a refunded one", async () => {
    currentLicenseMock.mockResolvedValue({ license: { ...ownedLicense, key: JSON_NULL, status: LICENSE_STATUS.REVOKED } })
    await renderApp(ROUTES.APP)

    expect(await screen.findByText(pagesAppMessages.overview.license.revoked)).toBeVisible()
    expect(await offer()).toBeVisible()
  })

  it("shows the key, invoices and how to change tier, and refreshes the machine list after freeing a slot", async () => {
    deactivateMock.mockResolvedValue({ deactivated: true })
    currentLicenseMock.mockResolvedValue({ license: ownedLicense })
    activationsMock.mockResolvedValueOnce({
      activations: [
        {
          created_at: "2026-09-08T10:00:00.000Z",
          id: "activation-1",
          label: "Development laptop",
          license_key_id: "polar-license-1",
          meta: {},
          modified_at: JSON_NULL,
        },
      ],
      limitActivations: 2,
    })
    const { user } = await renderApp(ROUTES.APP_LICENSE)

    expect(await screen.findByText(LICENSE_KEY)).toBeVisible()
    expect(screen.getByRole("link", { name: pagesLicenseMessages.manage })).toHaveAttribute("href", ROUTES.API_AUTH_CUSTOMER_PORTAL)
    expect(screen.getByRole("link", { name: CONTACT_EMAIL })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
    expect(screen.queryByRole("region", { name: buy.title })).toBeNull()
    await user.click(screen.getByRole("button", { name: pagesLicenseMessages.activations.deactivate }))

    expect(deactivateMock).toHaveBeenCalledExactlyOnceWith({ activationId: "activation-1" }, expect.anything())
    await waitFor(() => {
      expect(screen.queryByText("Development laptop")).toBeNull()
    })
    expect(screen.getByText(pagesLicenseMessages.activations.none)).toBeVisible()
    expect(toast.success).toHaveBeenCalledWith(pagesLicenseMessages.activations.success)
  })

  it("explains a refunded license and offers a new one", async () => {
    currentLicenseMock.mockResolvedValue({ license: { ...ownedLicense, status: LICENSE_STATUS.REVOKED } })
    await renderApp(ROUTES.APP_LICENSE)

    expect(await screen.findByText(pagesLicenseMessages.revoked)).toBeVisible()
    expect(await offer()).toBeVisible()
  })

  it("shows a pending key honestly, without a machine list before provisioning", async () => {
    currentLicenseMock.mockResolvedValue({ license: { ...ownedLicense, key: JSON_NULL, polarLicenseKeyId: JSON_NULL } })
    await renderApp(ROUTES.APP_LICENSE)

    expect(await screen.findByText(pagesLicenseMessages.pending)).toBeVisible()
    expect(screen.queryByRole("heading", { name: pagesLicenseMessages.activations.title })).toBeNull()
  })

  it("supports unlimited activations and keeps the machine when deactivation fails", async () => {
    const request = Promise.withResolvers<{ deactivated: true }>()
    deactivateMock.mockReturnValueOnce(request.promise)
    currentLicenseMock.mockResolvedValue({ license: ownedLicense })
    activationsMock.mockResolvedValue({
      activations: [
        {
          created_at: "2026-09-08T10:00:00.000Z",
          id: "activation-2",
          label: "Workstation",
          license_key_id: "polar-license-1",
          meta: {},
          modified_at: JSON_NULL,
        },
      ],
      limitActivations: JSON_NULL,
    })
    const { user } = await renderApp(ROUTES.APP_LICENSE)

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
  })
})

describe("license cards", () => {
  it.each([
    ["license card", LicenseCard],
    ["license status card", LicenseStatusCard],
  ] as const)("renders no %s for an account without a license", (_, Card) => {
    const queryClient = new QueryClient()
    queryClient.setQueryData(currentLicenseQuery.queryKey, { license: undefined })

    const { container } = renderWithRouter(
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
        <Card />
      </IntlProvider>,
      { queryClient },
    )

    expect(container).toBeEmptyDOMElement()
  })
})

describe("license page text", () => {
  it("keeps its heading and description and links back to the overview", async () => {
    await renderApp(ROUTES.APP_LICENSE)

    expect(await screen.findByRole("heading", { level: 1, name: pagesLicenseMessages.metadata.title })).toBeVisible()
    expect(screen.getByText(pagesLicenseMessages.metadata.description)).toBeVisible()
    expect(screen.getByRole("link", { name: pagesLicenseMessages.back })).toHaveAttribute("href", ROUTES.APP)
    expect(screen.getByText(unlocks.title.replace("{tiers}", "Complete and Agency"))).toBeVisible()
  })
})
