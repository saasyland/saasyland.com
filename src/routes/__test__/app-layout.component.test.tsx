import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRoute, createRouter } from "@tanstack/react-router"
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { AppRouterProvider } from "~/src/providers/app-router-provider"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { Route as AppRoute } from "~/src/routes/app"
import { Route as OverviewRoute } from "~/src/routes/app.index"
import { Route as LicenseRoute } from "~/src/routes/app.license"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

const sessionRequest = vi.hoisted(() => vi.fn())
const currentLicense = vi.hoisted(() => vi.fn())
const activations = vi.hoisted(() => vi.fn())
const messages = getTestMessages("en-US")
const { navigation } = messages.pages.app

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})
vi.mock(import("~/src/modules/license/use-cases/get-current-license"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    currentLicenseQuery: { ...actual.currentLicenseQuery, queryFn: currentLicense },
    licenseActivationsQuery: { ...actual.licenseActivationsQuery, queryFn: activations },
  }
})

const renderApp = async (path: string) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const root = createRootRouteWithContext<RouterContext>()({
    component: () => (
      <AppRouterProvider>
        <Outlet />
      </AppRouterProvider>
    ),
  })
  Object.assign(AppRoute.options, { getParentRoute: () => root, id: "/app", path: "/app" })
  Object.assign(OverviewRoute.options, { getParentRoute: () => AppRoute, id: "/", path: "/" })
  Object.assign(LicenseRoute.options, { getParentRoute: () => AppRoute, id: "/license", path: "/license" })
  const nested = createRoute({ component: () => <p>Activation details</p>, getParentRoute: () => AppRoute, path: "/license/details" })
  const signIn = createRoute({ component: () => <h1>Sign in required</h1>, getParentRoute: () => root, path: ROUTES.SIGN_IN })
  const docs = createRoute({ component: () => <h1>Documentation</h1>, getParentRoute: () => root, path: ROUTES.DOCS })
  const router = createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree: root.addChildren([signIn, docs, AppRoute.addChildren([OverviewRoute, LicenseRoute, nested])]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en-US" messages={messages} timeZone="UTC">
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { queryClient, router, user: userEvent.setup() }
}

beforeEach(() => {
  sessionRequest.mockReset().mockResolvedValue(createAuthSessionFixture())
  currentLicense.mockReset().mockResolvedValue(JSON_NULL)
  activations.mockReset().mockResolvedValue({ activations: [], limitActivations: 2 })
  vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {})
  vi.stubGlobal(
    "matchMedia",
    vi.fn((query: string) => ({
      media: query,
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
    })),
  )
})

describe("customer workspace routes", () => {
  it("redirects guests before loading account or license data", async () => {
    sessionRequest.mockResolvedValue(JSON_NULL)
    const { router } = await renderApp(ROUTES.APP)
    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeVisible()
    expect(router.state.location.pathname).toBe(ROUTES.SIGN_IN)
    expect(currentLicense).not.toHaveBeenCalled()
    expect(activations).not.toHaveBeenCalled()
  })

  it.each([
    [ROUTES.APP, navigation.overview, messages.pages.app.title],
    [ROUTES.APP_LICENSE, navigation.license, messages.pages.license.title],
  ])("loads %s with active navigation, metadata, and a single license lookup", async (path, active, heading) => {
    const { queryClient, router } = await renderApp(path)
    expect(await screen.findByRole("heading", { level: 1, name: heading })).toBeVisible()
    const nav = screen.getByRole("navigation", { name: navigation.label })
    expect(within(nav).getByRole("link", { name: active })).toHaveAttribute("aria-current", "page")
    expect(
      within(screen.getByRole("navigation", { name: navigation.resources })).getByRole("link", { name: navigation.support }),
    ).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
    expect(screen.getByRole("link", { name: navigation.website })).toHaveAttribute("href", ROUTES.HOME)
    expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "pages.app" }).queryKey)).toBeDefined()
    expect(currentLicense).toHaveBeenCalledOnce()
    expect(router.state.matches.at(-1)?.meta).toEqual(expect.arrayContaining([expect.objectContaining({ name: "description" })]))
  })

  it("keeps the license navigation active for nested pages and falls back to the overview header", async () => {
    await renderApp(`${ROUTES.APP_LICENSE}/details`)
    expect(await screen.findByText("Activation details")).toBeVisible()
    const nav = screen.getByRole("navigation", { name: navigation.label })
    expect(within(nav).getByRole("link", { name: navigation.license })).toHaveAttribute("aria-current", "page")
    expect(within(nav).getByRole("link", { name: navigation.overview })).not.toHaveAttribute("aria-current")
    expect(within(screen.getByRole("banner")).getByText(navigation.overview)).toBeVisible()
  })

  it("uses the email as the account name when the profile has no name", async () => {
    const session = createAuthSessionFixture()
    sessionRequest.mockResolvedValue({ ...session, user: { ...session.user, name: "" } })
    await renderApp(ROUTES.APP)
    const account = await screen.findByRole("region", { name: messages.pages.app.account.label })
    expect(within(account).getAllByText(session.user.email)).toHaveLength(2)
  })

  it("allows sidebar navigation, the brand shortcut, and documentation links", async () => {
    const { router, user } = await renderApp(ROUTES.APP)
    await screen.findByRole("heading", { name: messages.pages.app.title })
    const nav = screen.getByRole("navigation", { name: navigation.label })
    await user.click(within(nav).getByRole("link", { name: navigation.license }))
    expect(await screen.findByRole("heading", { level: 1, name: messages.pages.license.title })).toBeVisible()
    await user.click(screen.getByRole("link", { name: "SaaSy Land" }))
    expect(await screen.findByRole("heading", { name: messages.pages.app.title })).toBeVisible()
    await user.click(screen.getByRole("link", { name: navigation.documentation }))
    expect(await screen.findByRole("heading", { name: "Documentation" })).toBeVisible()
    expect(router.state.location.pathname).toBe(ROUTES.DOCS)
  })
})
