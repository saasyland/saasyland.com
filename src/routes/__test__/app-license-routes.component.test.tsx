import { CLI_VARIABLE } from "@saasyland/stack/cli"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRoute, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { createTranslator } from "use-intl"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"
import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { AriaProvider } from "~/src/providers/aria-provider"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { QUERY_STALE_TIME_MS } from "~/src/integrations/tanstack-query/query.cache"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type { signOutUserMutation } from "~/src/modules/account/use-cases/sign-out-user"
import {
  LICENSE_MUTATION_KEYS,
  LICENSE_POLL_MS,
  LICENSE_QUERY_KEYS,
  LICENSE_STATUS,
  LICENSE_TIER,
} from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import type { deactivateLicenseMutation } from "~/src/modules/license/use-cases/deactivate-license"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import type { getCurrentLicenseActivations } from "~/src/modules/license/use-cases/get-current-license-activations"
import type { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"

import { Route as AppRoute } from "~/src/routes/app"
import { Route as OverviewRoute } from "~/src/routes/app.index"
import { Route as LicenseRoute } from "~/src/routes/app.license"

import { CLI_KEY_LINES, SCAFFOLD_DIR } from "~/src/data/cli"
import { LICENSE_OFFER_ID } from "~/src/data/license"
import { COURSE_PLATFORM_VALUES } from "~/src/data/marketing"
import { REFUND_TERMS } from "~/src/data/refunds"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { LicenseCard } from "~/src/presentation/components/custom/app/license-card"
import { LicenseStatusCard } from "~/src/presentation/components/custom/app/license-status-card"

import commonMessages from "~/messages/en-US/common.json"
import bannerMessages from "~/messages/en-US/components.custom.email-verification-banner.json"
import pricingMessages from "~/messages/en-US/components.custom.pricing.json"
import errorsMessages from "~/messages/en-US/errors.json"
import navigationLicenseMessages from "~/messages/en-US/navigation.license.json"
import pagesAppMessages from "~/messages/en-US/pages.app.json"
import pagesAppSidebarMessages from "~/messages/en-US/pages.app.sidebar.json"
import pagesLicenseMessages from "~/messages/en-US/pages.license.json"
import plPricingMessages from "~/messages/pl-PL/components.custom.pricing.json"
import plErrorsMessages from "~/messages/pl-PL/errors.json"
import plPagesLicenseMessages from "~/messages/pl-PL/pages.license.json"
import ukPagesLicenseMessages from "~/messages/uk-UA/pages.license.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

const LICENSE_KEY = "private-purchased-license-key"
const CHECKOUT_ID = "4b1f1a63-6d4e-4c3f-9d8e-2f6a0b7c9d10"
const { activation, buy, chosen, copy, statusCard } = pagesLicenseMessages
const SECTION_NAME = vi.hoisted(() => "Included with every tier")

const sessionRequest = vi.hoisted(() => vi.fn())
const currentLicenseMock = vi.hoisted(() => vi.fn<() => Promise<{ license: License["select"] | undefined }>>())
const licenseKeyMock = vi.hoisted(() => vi.fn<() => Promise<{ key: string | null | undefined }>>())
const activationsMock = vi.hoisted(() => vi.fn<() => ReturnType<typeof getCurrentLicenseActivations>>())
const sectionLoad = vi.hoisted(() => vi.fn<() => Promise<unknown>>())
const checkoutMock = vi.hoisted(() => vi.fn<NonNullable<typeof startCheckoutMutation.mutationFn>>())
const deactivateMock = vi.hoisted(() => vi.fn<NonNullable<typeof deactivateLicenseMutation.mutationFn>>())
const signOutMock = vi.hoisted(() => vi.fn<NonNullable<typeof signOutUserMutation.mutationFn>>())
const triggerConfettiMock = vi.hoisted(() => vi.fn<() => void>())

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})
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
vi.mock(import("~/src/modules/license/use-cases/get-current-license-activations"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, licenseActivationsQuery: { ...actual.licenseActivationsQuery, queryFn: activationsMock } }
})
vi.mock("~/src/data/license-offer.entries", () => ({
  TEST_LICENSE_OFFER: [
    {
      key: "included",
      load: sectionLoad,
      Pending: () => {},
      Section: () => <section aria-label={SECTION_NAME} />,
    },
  ],
}))
vi.mock(import("~/src/modules/license/use-cases/start-checkout"), () => ({
  startCheckoutMutation: { mutationFn: checkoutMock, mutationKey: LICENSE_MUTATION_KEYS.START_CHECKOUT },
}))
vi.mock(import("~/src/modules/license/use-cases/deactivate-license"), () => ({
  deactivateLicenseMutation: { mutationFn: deactivateMock, mutationKey: LICENSE_MUTATION_KEYS.DEACTIVATE },
}))
vi.mock(import("~/src/lib/confetti"), () => ({ triggerConfetti: triggerConfettiMock }))
vi.mock(import("~/src/modules/account/use-cases/sign-out-user"), () => ({
  signOutUserMutation: { mutationFn: signOutMock, mutationKey: ACCOUNT_MUTATION_KEYS.SIGN_OUT },
}))

const ownedLicense: License["select"] = {
  activatedAt: null,
  createdAt: new Date("2026-09-08T10:00:00Z"),
  deliveredAt: null,
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
  withdrawalConsentAt: null,
}

const renderApp = async (path: string, locale: SupportedLocale = "en-US") => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: QUERY_STALE_TIME_MS } },
  })
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
  const signIn = createRoute({ component: () => <h1>Sign in required</h1>, getParentRoute: () => root, path: ROUTES.SIGN_IN })
  const router = createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree: root.addChildren([terms, signIn, AppRoute.addChildren([OverviewRoute, LicenseRoute])]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider formats={I18N.FORMATS} locale={locale} messages={getTestMessages(locale)} timeZone={I18N.DEFAULT_TIMEZONE}>
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { queryClient, router, user: userEvent.setup({ delay: null }) }
}

const offer = () => screen.findByRole("region", { name: buy.title })

const tierButton = (tier: keyof typeof pricingMessages.tiers) => screen.getByRole("button", { name: pricingMessages.tiers[tier].cta })

const plainText = (chunks: string): string => chunks

const notice = (key: "consent" | "refund"): string =>
  createTranslator({ locale: "en-US", messages: pagesLicenseMessages }).markup(`buy.notice.${key}`, {
    days: REFUND_TERMS.WITHDRAWAL_DAYS,
    refunds: plainText,
  })

const paragraph = (text: string) => (_: string, element: Element | null) => element?.tagName === "P" && element.textContent === text

const startPolishCheckout = async () => {
  vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/pl-PL/app/license"))
  const { user } = await renderApp(ROUTES.APP_LICENSE, "pl-PL")
  const region = await screen.findByRole("region", { name: plPagesLicenseMessages.buy.title })

  await user.click(within(region).getByRole("button", { name: plPricingMessages.tiers.agency.cta }))
  return { region, user }
}

beforeEach(() => {
  sessionRequest.mockReset().mockResolvedValue(createAuthSessionFixture())
  currentLicenseMock.mockReset().mockResolvedValue({ license: undefined })
  licenseKeyMock.mockReset().mockResolvedValue({ key: LICENSE_KEY })
  activationsMock.mockReset().mockResolvedValue({ activations: [], limitActivations: 2 })
  sectionLoad.mockReset().mockResolvedValue(undefined)
  checkoutMock.mockReset()
  deactivateMock.mockReset()
  signOutMock.mockReset().mockResolvedValue({ redirect: undefined, success: true, url: undefined })
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

const withFeatureValues = (message: string): string =>
  createTranslator({ locale: "en-US", messages: { message } })("message", {
    coverageThreshold: REPOSITORY_FACTS.coverageThreshold,
    ...COURSE_PLATFORM_VALUES,
  })

describe("buying a license", () => {
  it.each([ROUTES.APP, ROUTES.APP_LICENSE])("offers every tier with its price and features on %s", async (path) => {
    await renderApp(path)

    const region = await offer()
    for (const tier of Object.values(pricingMessages.tiers)) {
      expect(within(region).getByRole("heading", { level: 3, name: tier.name })).toBeVisible()
      expect(within(region).getByRole("button", { name: tier.cta })).toBeEnabled()
      for (const feature of Object.values(tier.features)) {
        expect(within(region).getByText(withFeatureValues(feature))).toBeVisible()
      }
    }
    expect(within(region).getAllByText(pricingMessages.status.available)).toHaveLength(Object.keys(pricingMessages.tiers).length)
    expect(within(region).getAllByText(pricingMessages.status.arriving)).toHaveLength(Object.keys(pricingMessages.tiers).length)
    expect(within(region).getAllByText(pricingMessages.mostPopular)).toHaveLength(1)
    expect(within(region).getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", ROUTES.TERMS)
    expect(screen.queryByRole("region", { name: chosen.title.replace("{tier}", pricingMessages.tiers.complete.name) })).toBeNull()
  })

  it.each([ROUTES.APP, ROUTES.APP_LICENSE])("ends the offer on %s with what other areas include and loads their data", async (path) => {
    const { queryClient } = await renderApp(path)

    expect(within(await offer()).getByRole("region", { name: SECTION_NAME })).toBeInTheDocument()
    expect(sectionLoad).toHaveBeenCalledWith({ locale: "en-US", queryClient })
  })

  it("says next to the buttons that Polar asks for the consent, when the refund ends and which terms apply", async () => {
    await renderApp(ROUTES.APP_LICENSE)

    const region = await offer()
    expect(within(region).getByText(notice("consent"))).toBeVisible()
    const refund = paragraph(notice("refund"))
    expect(within(region).getByText(refund)).toBeVisible()
    expect(within(region).getByRole("link", { name: "Refund Policy" })).toHaveAttribute("href", ROUTES.REFUNDS)
    expect(within(region).getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", ROUTES.TERMS)
    expect(within(region).getByRole("link", { name: "Commercial Licence" })).toHaveAttribute("href", ROUTES.LICENCE)
    expect(within(region).queryByText(buy.notice.english, { exact: false })).toBeNull()
  })

  it("warns a reader of a language Polar does not translate that the payment page opens in English", async () => {
    vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/uk-UA/app/license"))
    await renderApp(ROUTES.APP_LICENSE, "uk-UA")

    const region = await screen.findByRole("region", { name: ukPagesLicenseMessages.buy.title })
    expect(within(region).getByText(ukPagesLicenseMessages.buy.notice.english, { exact: false })).toBeVisible()
  })

  it("opens the checkout straight away, with no dialog, in the page's language and back to this page", async () => {
    checkoutMock.mockReturnValue(new Promise(() => {}))
    await startPolishCheckout()

    expect(screen.queryByRole("dialog")).toBeNull()
    expect(checkoutMock).toHaveBeenCalledExactlyOnceWith(
      { locale: "pl-PL", returnPath: ROUTES.APP_LICENSE, tier: LICENSE_TIER.AGENCY },
      expect.anything(),
    )
  })

  it("keeps every tier button off while the checkout starts and recovers after a failure", async () => {
    const checkout = Promise.withResolvers<{ url: string }>()
    checkoutMock.mockReturnValue(checkout.promise)
    const { region } = await startPolishCheckout()

    const pending = within(region).getByRole("button", { name: (name) => name.endsWith(plPagesLicenseMessages.buy.pending) })
    expect(pending).toHaveAttribute("aria-disabled", "true")
    expect(within(region).getByRole("button", { name: plPricingMessages.tiers.core.cta })).toBeDisabled()

    await act(async () => {
      checkout.reject(new Error("Checkout unavailable"))
      await checkout.promise.catch(() => {})
    })

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(plErrorsMessages.codes.INTERNAL_ERROR)
    })
    expect(within(region).getByRole("button", { name: plPricingMessages.tiers.agency.cta })).toBeEnabled()
    expect(within(region).getByRole("button", { name: plPricingMessages.tiers.core.cta })).toBeEnabled()
    expect(checkoutMock).toHaveBeenCalledOnce()
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
    expect(checkoutMock).toHaveBeenCalledExactlyOnceWith(
      { locale: "en-US", returnPath: ROUTES.APP, tier: LICENSE_TIER.CORE },
      expect.anything(),
    )
    globalThis.history.replaceState({}, "", "/")
  })

  it("explains a refused checkout and switches a stale page to the license it already owns", async () => {
    checkoutMock.mockResolvedValue({ alreadyActive: true })
    const { user } = await renderApp(ROUTES.APP)
    await offer()
    currentLicenseMock.mockResolvedValue({ license: ownedLicense })

    await user.click(tierButton(LICENSE_TIER.COMPLETE))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(`You already have an active licence. To move to another tier, email ${CONTACT_EMAIL}.`)
    })
    expect(await screen.findByRole("heading", { name: statusCard.title })).toBeVisible()
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.queryByRole("region", { name: buy.title })).toBeNull()
  })
})

describe("a tier chosen on the pricing page", () => {
  it.each([ROUTES.APP, ROUTES.APP_LICENSE])("is highlighted on %s and goes straight to checkout", async (path) => {
    checkoutMock.mockReturnValue(new Promise(() => {}))
    const { user } = await renderApp(`${path}?tier=${LICENSE_TIER.COMPLETE}`)

    const card = await screen.findByRole("region", { name: `Continue with ${pricingMessages.tiers.complete.name}` })
    expect(within(card).getByText(`You chose ${pricingMessages.tiers.complete.name}`, { exact: false })).toBeVisible()
    expect(within(card).getByText("$399", { selector: ".pv-100" })).toBeInTheDocument()

    expect(within(card).getByText(notice("consent"))).toBeVisible()
    await user.click(within(card).getByRole("button", { name: chosen.continue }))

    expect(checkoutMock).toHaveBeenCalledExactlyOnceWith(
      { locale: "en-US", returnPath: `${path}?tier=${LICENSE_TIER.COMPLETE}`, tier: LICENSE_TIER.COMPLETE },
      expect.anything(),
    )
  })

  it("carries the page the buyer came from, such as a lesson, into the checkout", async () => {
    checkoutMock.mockReturnValue(new Promise(() => {}))
    const lesson = "/courses/the-walkthrough/billing"
    const path = `${ROUTES.APP_LICENSE}?tier=${LICENSE_TIER.COMPLETE}&redirect=${encodeURIComponent(lesson)}`
    const { user } = await renderApp(path)

    const card = await screen.findByRole("region", { name: `Continue with ${pricingMessages.tiers.complete.name}` })
    await user.click(within(card).getByRole("button", { name: chosen.continue }))

    expect(checkoutMock).toHaveBeenCalledExactlyOnceWith(
      { locale: "en-US", redirect: lesson, returnPath: path, tier: LICENSE_TIER.COMPLETE },
      expect.anything(),
    )
  })

  it("ignores a tier the app does not sell", async () => {
    await renderApp(`${ROUTES.APP}?tier=enterprise`)

    await offer()
    expect(screen.queryByRole("button", { name: chosen.continue })).toBeNull()
  })

  it("is not offered to an account that already owns a license", async () => {
    currentLicenseMock.mockResolvedValue({ license: ownedLicense })
    await renderApp(`${ROUTES.APP}?tier=${LICENSE_TIER.COMPLETE}`)

    expect(await screen.findByRole("heading", { name: statusCard.title })).toBeVisible()
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
    licenseKeyMock.mockResolvedValue({ key: JSON_NULL })
    await renderApp(`${ROUTES.APP_LICENSE}?checkoutId=${CHECKOUT_ID}`)

    expect(await screen.findByRole("heading", { name: activation.active.title })).toBeVisible()
    expect(screen.getByText(activation.active.body.replace("{tier}", pricingMessages.tiers.agency.name))).toBeVisible()
    expect(screen.getByRole("region", { name: pagesLicenseMessages.setup.title })).toBeVisible()
    expect(screen.getByRole("heading", { name: pricingMessages.tiers.agency.name })).toBeVisible()
    expect(screen.getByText(pagesLicenseMessages.pending)).toBeVisible()
  })

  it("hides a refunded license while its replacement activates", async () => {
    currentLicenseMock.mockResolvedValue({ license: { ...ownedLicense, status: LICENSE_STATUS.REFUNDED } })
    await renderApp(`${ROUTES.APP_LICENSE}?checkoutId=${CHECKOUT_ID}`)

    expect(await screen.findByRole("heading", { name: activation.activating.title })).toBeVisible()
    expect(screen.queryByText(pagesLicenseMessages.refunded)).toBeNull()
  })

  it("ignores a checkout reference that is not a Polar checkout id", async () => {
    await renderApp(`${ROUTES.APP}?checkoutId=not-a-checkout`)

    await offer()
    expect(screen.queryByRole("heading", { name: activation.activating.title })).toBeNull()
  })
})

describe("owning a license", () => {
  it.each([
    { key: LICENSE_KEY, license: ownedLicense, status: statusCard.active },
    { key: JSON_NULL, license: { ...ownedLicense, key: JSON_NULL, polarLicenseKeyId: JSON_NULL }, status: statusCard.pending },
  ])(
    "shows the purchased tier, its $status state and the first steps on the overview, without the offer",
    async ({ key, license, status }) => {
      currentLicenseMock.mockResolvedValue({ license })
      licenseKeyMock.mockResolvedValue({ key })
      await renderApp(ROUTES.APP)

      expect(await screen.findByText(pricingMessages.tiers.agency.name)).toBeVisible()
      expect(screen.getByText(status)).toBeVisible()
      expect(screen.getByRole("link", { name: statusCard.action })).toHaveAttribute("href", ROUTES.APP_LICENSE)
      expect(screen.getByRole("region", { name: pagesLicenseMessages.setup.title })).toBeVisible()
      expect(screen.queryByRole("region", { name: buy.title })).toBeNull()
      expect(screen.getByRole("link", { name: pagesAppMessages.overview.docs.action })).toHaveAttribute("href", ROUTES.DOCS_CLI)
    },
  )

  it.each([LICENSE_STATUS.REFUNDED, LICENSE_STATUS.REVOKED])(
    "offers a new license next to a %s one, without the first steps",
    async (status) => {
      currentLicenseMock.mockResolvedValue({ license: { ...ownedLicense, key: JSON_NULL, status } })
      await renderApp(ROUTES.APP)

      expect(await screen.findByText(statusCard[status])).toBeVisible()
      expect(screen.queryByRole("region", { name: pagesLicenseMessages.setup.title })).toBeNull()
      expect(await offer()).toBeVisible()
    },
  )

  it("withholds the key and the invoices until the buyer confirms their email, and says where the link went", async () => {
    const confirmed = createAuthSessionFixture()
    sessionRequest.mockResolvedValue({ ...confirmed, user: { ...confirmed.user, emailVerified: false } })
    currentLicenseMock.mockResolvedValue({ license: ownedLicense })
    licenseKeyMock.mockResolvedValue({ key: undefined })
    await renderApp(ROUTES.APP_LICENSE)

    expect(await screen.findAllByText(confirmed.user.email, { selector: "p > strong" })).toHaveLength(2)
    expect(
      screen.getByText((_, element) => element?.tagName === "P" && element.textContent.startsWith("Your key appears here")),
    ).toBeVisible()
    expect(screen.queryByText(LICENSE_KEY)).toBeNull()
    expect(screen.queryByRole("link", { name: pagesLicenseMessages.manage })).toBeNull()
    expect(screen.getByRole("region", { name: bannerMessages.title })).toBeVisible()
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
    expect(screen.getByText(pagesLicenseMessages.activations.activated.replace("{date}", "Sep 8, 2026, 10:00 AM UTC"))).toBeVisible()
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
})

describe("the licence key, its commands and its machines", () => {
  it("shows the key and the CLI commands that activate it, generate a project, show and free a machine, each to copy", async () => {
    currentLicenseMock.mockResolvedValue({ license: ownedLicense })
    activationsMock.mockResolvedValue({ activations: [], limitActivations: 2 })
    await renderApp(ROUTES.APP_LICENSE)

    expect(await screen.findByText(pagesLicenseMessages.usage)).toBeVisible()
    expect(screen.getByRole("button", { name: copy.key })).toBeEnabled()
    const terms = screen.getAllByRole("term")
    expect(terms).toHaveLength(CLI_KEY_LINES.length)
    for (const [index, { command }] of CLI_KEY_LINES.entries()) {
      expect(within(terms[index] ?? document.body).getByText(command)).toBeVisible()
      expect(within(terms[index] ?? document.body).getByRole("button", { name: copy.command.replace("{command}", command) })).toBeEnabled()
    }
    const descriptions = screen.getAllByRole("definition").map((definition) => definition.textContent)
    expect(descriptions).toContain(pagesLicenseMessages.commands.activate)
    const t = createTranslator({ locale: "en-US", messages: pagesLicenseMessages })
    expect(descriptions).toContain(t.markup("commands.init", { days: REFUND_TERMS.WITHDRAWAL_DAYS, dir: SCAFFOLD_DIR, refunds: plainText }))
    expect(screen.getByText(CLI_VARIABLE.LICENSE_KEY).tagName).toBe("CODE")
    expect(screen.getByText(CLI_VARIABLE.LICENSE_KEY).parentElement).toHaveTextContent(
      pagesLicenseMessages.ci.replace("<code>{variable}</code>", CLI_VARIABLE.LICENSE_KEY),
    )
  })

  it.each([LICENSE_STATUS.REFUNDED, LICENSE_STATUS.REVOKED])(
    "explains a %s license without its key, commands or machines, and offers a new one or support",
    async (status) => {
      currentLicenseMock.mockResolvedValue({ license: { ...ownedLicense, status } })
      await renderApp(ROUTES.APP_LICENSE)

      expect(await screen.findByText(pagesLicenseMessages[status])).toBeVisible()
      expect(screen.getByRole("link", { name: pagesLicenseMessages.inactive.buyAgain })).toHaveAttribute("href", `#${LICENSE_OFFER_ID}`)
      expect(screen.getByRole("link", { name: pagesLicenseMessages.inactive.support })).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
      expect(screen.queryByText(LICENSE_KEY)).toBeNull()
      expect(screen.queryByText(pagesLicenseMessages.pending)).toBeNull()
      expect(screen.queryByText(pagesLicenseMessages.usage)).toBeNull()
      expect(screen.queryByRole("heading", { name: pagesLicenseMessages.activations.title })).toBeNull()
      expect(await offer()).toHaveAttribute("id", LICENSE_OFFER_ID)
    },
  )

  it("says a pending key is on its way and shows it without a refresh, without a machine list before provisioning", async () => {
    const pending = { ...ownedLicense, key: JSON_NULL, polarLicenseKeyId: JSON_NULL }
    currentLicenseMock.mockResolvedValue({ license: pending })
    licenseKeyMock.mockResolvedValue({ key: JSON_NULL })
    await renderApp(ROUTES.APP_LICENSE)

    expect(await screen.findByText(pagesLicenseMessages.pending)).toBeVisible()
    expect(screen.queryByRole("heading", { name: pagesLicenseMessages.activations.title })).toBeNull()

    currentLicenseMock.mockResolvedValue({ license: ownedLicense })
    licenseKeyMock.mockResolvedValue({ key: LICENSE_KEY })
    expect(await screen.findByText(LICENSE_KEY, {}, { timeout: LICENSE_POLL_MS.KEY * 2 })).toBeVisible()
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
    queryClient.setQueryData(LICENSE_QUERY_KEYS.KEY, { key: undefined })

    const { container } = renderWithRouter(
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
        <Card />
      </IntlProvider>,
      { queryClient },
    )

    expect(container).toBeEmptyDOMElement()
  })
})

describe("the license in the customer workspace", () => {
  it("marks the license active in the navigation, sets the page metadata and looks the license up once", async () => {
    const { router } = await renderApp(ROUTES.APP_LICENSE)

    expect(await screen.findByRole("heading", { level: 1, name: pagesLicenseMessages.metadata.title })).toBeVisible()
    const navigation = screen.getByRole("navigation", { name: pagesAppSidebarMessages.navigation.label })
    expect(within(navigation).getByRole("link", { name: navigationLicenseMessages.app.license })).toHaveAttribute("aria-current", "page")
    expect(currentLicenseMock).toHaveBeenCalledOnce()
    expect(router.state.matches.at(-1)?.meta).toEqual(
      expect.arrayContaining([expect.objectContaining({ content: pagesLicenseMessages.metadata.description, name: "description" })]),
    )
  })

  it("removes the cached license when the customer signs out", async () => {
    const { queryClient, user } = await renderApp(ROUTES.APP_LICENSE)
    await screen.findByRole("heading", { level: 1, name: pagesLicenseMessages.metadata.title })
    expect(queryClient.getQueryData(currentLicenseQuery.queryKey)).toStrictEqual({ license: undefined })

    await user.click(screen.getByRole("button", { name: commonMessages.signOut }))

    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeVisible()
    expect(queryClient.getQueryData(currentLicenseQuery.queryKey)).toBeUndefined()
  })
})

describe("license page text", () => {
  it("keeps its heading and description and links back to the overview", async () => {
    await renderApp(ROUTES.APP_LICENSE)

    expect(await screen.findByRole("heading", { level: 1, name: pagesLicenseMessages.metadata.title })).toBeVisible()
    expect(screen.getByText(pagesLicenseMessages.metadata.description)).toBeVisible()
    expect(screen.getByRole("link", { name: pagesLicenseMessages.back })).toHaveAttribute("href", ROUTES.APP)
  })
})
