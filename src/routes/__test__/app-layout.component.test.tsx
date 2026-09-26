import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRoute, createRouter } from "@tanstack/react-router"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { AriaProvider } from "~/src/providers/aria-provider"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { ACCOUNT_MUTATION_KEYS } from "~/src/modules/account/account.constants"
import type { signOutUserMutation } from "~/src/modules/account/use-cases/sign-out-user"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { Route as AppRoute } from "~/src/routes/app"
import { Route as OverviewRoute } from "~/src/routes/app.index"
import { Route as LicenseRoute } from "~/src/routes/app.license"

import commonMessages from "~/messages/en-US/common.json"
import pagesAppMessages from "~/messages/en-US/pages.app.json"
import pagesLicenseMessages from "~/messages/en-US/pages.license.json"
import plCommonMessages from "~/messages/pl-PL/common.json"
import plErrorMessages from "~/messages/pl-PL/errors.json"
import { CONTACT_EMAIL } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

type SignOutResult = Awaited<ReturnType<NonNullable<typeof signOutUserMutation.mutationFn>>>

const sessionRequest = vi.hoisted(() => vi.fn())
const currentLicense = vi.hoisted(() => vi.fn())
const activations = vi.hoisted(() => vi.fn())
const signOutMock = vi.hoisted(() => vi.fn<NonNullable<typeof signOutUserMutation.mutationFn>>())
const SIGN_OUT_SUCCESS = { redirect: undefined, success: true, url: undefined } satisfies SignOutResult
const { account, navigation } = pagesAppMessages

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
vi.mock(import("~/src/modules/account/use-cases/sign-out-user"), () => ({
  signOutUserMutation: { mutationFn: signOutMock, mutationKey: ACCOUNT_MUTATION_KEYS.SIGN_OUT },
}))

const renderApp = async (path: string, locale: SupportedLocale = "en-US") => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
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
      <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { queryClient, router, user: userEvent.setup() }
}

beforeEach(() => {
  sessionRequest.mockReset().mockResolvedValue(createAuthSessionFixture())
  currentLicense.mockReset().mockResolvedValue({ license: undefined })
  activations.mockReset().mockResolvedValue({ activations: [], limitActivations: 2 })
  signOutMock.mockReset().mockResolvedValue(SIGN_OUT_SUCCESS)
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
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

afterEach(() => {
  vi.restoreAllMocks()
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
    [ROUTES.APP, navigation.overview, pagesAppMessages.metadata.title],
    [ROUTES.APP_LICENSE, navigation.license, pagesLicenseMessages.metadata.title],
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
    const region = await screen.findByRole("region", { name: account.label })
    expect(within(region).getAllByText(session.user.email)).toHaveLength(2)
  })

  it("allows sidebar navigation, the brand shortcut, and documentation links", async () => {
    const { router, user } = await renderApp(ROUTES.APP)
    await screen.findByRole("heading", { name: pagesAppMessages.metadata.title })
    const nav = screen.getByRole("navigation", { name: navigation.label })
    await user.click(within(nav).getByRole("link", { name: navigation.license }))
    expect(await screen.findByRole("heading", { level: 1, name: pagesLicenseMessages.metadata.title })).toBeVisible()
    await user.click(screen.getByRole("link", { name: "SaaSy Land" }))
    expect(await screen.findByRole("heading", { name: pagesAppMessages.metadata.title })).toBeVisible()
    await user.click(screen.getByRole("link", { name: navigation.documentation }))
    expect(await screen.findByRole("heading", { name: "Documentation" })).toBeVisible()
    expect(router.state.location.pathname).toBe(ROUTES.DOCS)
  })
})

describe("customer workspace account", () => {
  it("shows the signed-in customer's name and email in the account region", async () => {
    const session = createAuthSessionFixture()
    await renderApp(ROUTES.APP)
    const region = await screen.findByRole("region", { name: account.label })
    expect(within(region).getByText(session.user.name)).toBeVisible()
    expect(within(region).getByText(session.user.email)).toBeVisible()
    expect(within(region).getByRole("button", { name: commonMessages.signOut })).toBeEnabled()
    expect(signOutMock).not.toHaveBeenCalled()
  })

  it("clears cached session and license data and opens sign in after successful sign-out", async () => {
    const { queryClient, router, user } = await renderApp(ROUTES.APP)
    await user.click(await screen.findByRole("button", { name: commonMessages.signOut }))

    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeVisible()
    expect(router.state.location.pathname).toBe(ROUTES.SIGN_IN)
    expect(signOutMock).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toBeUndefined()
    expect(queryClient.getQueryData(currentLicenseQuery.queryKey)).toBeUndefined()
    expect(toast.success).toHaveBeenCalledWith(commonMessages.signedOut)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("keeps the cached account and license when sign-out fails and shows the localized error", async () => {
    signOutMock.mockRejectedValue(new Error("Connection failed"))
    const session = createAuthSessionFixture()
    const { queryClient, router, user } = await renderApp(ROUTES.APP, "pl-PL")
    await user.click(await screen.findByRole("button", { name: plCommonMessages.signOut }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(plErrorMessages.codes.INTERNAL_ERROR)
    })
    expect(queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toStrictEqual(session)
    expect(queryClient.getQueryData(currentLicenseQuery.queryKey)).toStrictEqual({ license: undefined })
    expect(screen.getByRole("button", { name: plCommonMessages.signOut })).toBeEnabled()
    expect(router.state.location.pathname).toBe(ROUTES.APP)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it("disables sign-out while pending and preserves the cache until the server confirms", async () => {
    const pending = Promise.withResolvers<SignOutResult>()
    signOutMock.mockReturnValue(pending.promise)
    const session = createAuthSessionFixture()
    const { queryClient, router, user } = await renderApp(ROUTES.APP)

    await user.click(await screen.findByRole("button", { name: commonMessages.signOut }))
    const pendingButton = await screen.findByRole("button", { name: commonMessages.signingOut })
    expect(pendingButton).toBeDisabled()
    await user.click(pendingButton)
    expect(signOutMock).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toStrictEqual(session)
    expect(router.state.location.pathname).toBe(ROUTES.APP)

    await act(async () => {
      pending.resolve(SIGN_OUT_SUCCESS)
      await pending.promise
    })

    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeVisible()
    expect(queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toBeUndefined()
    expect(queryClient.getQueryData(currentLicenseQuery.queryKey)).toBeUndefined()
  })
})
