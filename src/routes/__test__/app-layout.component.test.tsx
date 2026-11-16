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

import { Route as AppRoute } from "~/src/routes/app"
import { Route as OverviewRoute } from "~/src/routes/app.index"
import { Route as SettingsRoute } from "~/src/routes/app.settings"

import type { AppOverviewArea } from "~/src/data/app-overview"

import commonMessages from "~/messages/en-US/common.json"
import preferencesCardMessages from "~/messages/en-US/components.custom.preferences-card.json"
import navigationAuthMessages from "~/messages/en-US/navigation.auth.json"
import navigationContentMessages from "~/messages/en-US/navigation.content.json"
import pagesAppMessages from "~/messages/en-US/pages.app.json"
import pagesAppSettingsMessages from "~/messages/en-US/pages.app.settings.json"
import pagesAppSidebarMessages from "~/messages/en-US/pages.app.sidebar.json"
import timezonesMessages from "~/messages/en-US/timezones.json"
import plCommonMessages from "~/messages/pl-PL/common.json"
import plErrorMessages from "~/messages/pl-PL/errors.json"
import { APP_NAME, CONTACT_EMAIL } from "~/src/presentation/branding"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"

type SignOutResult = Awaited<ReturnType<NonNullable<typeof signOutUserMutation.mutationFn>>>

const sessionRequest = vi.hoisted(() => vi.fn())
const summaryRequest = vi.hoisted(() => vi.fn<() => Promise<{ readonly orders: number }>>())
const SUMMARY_QUERY_KEY = vi.hoisted(() => ["summary"] as const)
const SUMMARY_SECTION = vi.hoisted(() => "Account summary")
const signOutMock = vi.hoisted(() => vi.fn<NonNullable<typeof signOutUserMutation.mutationFn>>())
const SIGN_OUT_SUCCESS = { redirect: undefined, success: true, url: undefined } satisfies SignOutResult
const SUMMARY = { orders: 2 }
const { account, navigation } = pagesAppSidebarMessages

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})
vi.mock("~/src/data/app-overview.entries", () => ({
  TEST_APP_OVERVIEW: {
    search: {},
    sections: [
      {
        key: "summary",
        load: ({ queryClient }) => queryClient.query({ queryFn: summaryRequest, queryKey: SUMMARY_QUERY_KEY, staleTime: "static" }),
        Pending: () => {},
        Section: () => <section aria-label={SUMMARY_SECTION} />,
      },
    ],
  } satisfies AppOverviewArea,
}))
vi.mock(import("~/src/modules/account/use-cases/sign-out-user"), () => ({
  signOutUserMutation: { mutationFn: signOutMock, mutationKey: ACCOUNT_MUTATION_KEYS.SIGN_OUT },
}))

const renderApp = async (path: string, locale: SupportedLocale = "en-US") => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const root = createRootRouteWithContext<RouterContext>()({
    component: () => (
      <AriaProvider>
        <Outlet />
      </AriaProvider>
    ),
  })
  Object.assign(AppRoute.options, { getParentRoute: () => root, id: "/app", path: "/app" })
  Object.assign(OverviewRoute.options, { getParentRoute: () => AppRoute, id: "/", path: "/" })
  Object.assign(SettingsRoute.options, { getParentRoute: () => AppRoute, id: "/settings", path: "/settings" })
  const nested = createRoute({ component: () => <p>Session details</p>, getParentRoute: () => AppRoute, path: "/settings/details" })
  const signIn = createRoute({ component: () => <h1>Sign in required</h1>, getParentRoute: () => root, path: ROUTES.SIGN_IN })
  const docs = createRoute({ component: () => <h1>Documentation</h1>, getParentRoute: () => root, path: ROUTES.DOCS })
  const router = createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree: root.addChildren([signIn, docs, AppRoute.addChildren([OverviewRoute, SettingsRoute, nested])]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { queryClient, router, user: userEvent.setup({ delay: null }) }
}

beforeEach(() => {
  sessionRequest.mockReset().mockResolvedValue(createAuthSessionFixture())
  summaryRequest.mockReset().mockResolvedValue(SUMMARY)
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
  it("redirects guests before loading account or overview data", async () => {
    sessionRequest.mockResolvedValue(JSON_NULL)
    const { router } = await renderApp(ROUTES.APP)
    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeVisible()
    expect(router.state.location.pathname).toBe(ROUTES.SIGN_IN)
    expect(summaryRequest).not.toHaveBeenCalled()
  })

  it("loads the overview with active navigation, metadata, and each overview section loaded once", async () => {
    const { queryClient, router } = await renderApp(ROUTES.APP)
    expect(await screen.findByRole("heading", { level: 1, name: pagesAppMessages.metadata.title })).toBeVisible()
    const nav = screen.getByRole("navigation", { name: navigation.label })
    expect(within(nav).getByRole("link", { name: navigationAuthMessages.app.overview })).toHaveAttribute("aria-current", "page")
    expect(
      within(screen.getByRole("navigation", { name: navigation.resources })).getByRole("link", { name: navigation.support }),
    ).toHaveAttribute("href", `mailto:${CONTACT_EMAIL}`)
    expect(screen.getByRole("link", { name: navigation.website })).toHaveAttribute("href", ROUTES.HOME)
    expect(screen.getByRole("region", { name: SUMMARY_SECTION })).toBeVisible()
    expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "pages.app.sidebar" }).queryKey)).toBeDefined()
    expect(summaryRequest).toHaveBeenCalledOnce()
    expect(router.state.matches.at(-1)?.meta).toEqual(expect.arrayContaining([expect.objectContaining({ name: "description" })]))
  })

  it("loads the settings page with its navigation, metadata and the saved time zone, without the overview's data", async () => {
    const { queryClient, router } = await renderApp(ROUTES.APP_SETTINGS)

    expect(await screen.findByRole("heading", { level: 1, name: pagesAppSettingsMessages.metadata.title })).toBeVisible()
    const nav = screen.getByRole("navigation", { name: navigation.label })
    expect(within(nav).getByRole("link", { name: navigationAuthMessages.app.settings })).toHaveAttribute("aria-current", "page")
    expect(screen.getByRole("heading", { level: 2, name: preferencesCardMessages.title })).toBeVisible()
    expect(screen.getByRole("combobox", { name: preferencesCardMessages.timezone.label })).toHaveValue(timezonesMessages["Europe/Warsaw"])
    expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "timezones" }).queryKey)).toBeDefined()
    expect(summaryRequest).not.toHaveBeenCalled()
    expect(router.state.matches.at(-1)?.meta).toEqual(
      expect.arrayContaining([expect.objectContaining({ content: pagesAppSettingsMessages.metadata.description, name: "description" })]),
    )
  })

  it("keeps the settings navigation active for nested pages and falls back to the overview header", async () => {
    await renderApp(`${ROUTES.APP_SETTINGS}/details`)
    expect(await screen.findByText("Session details")).toBeVisible()
    const nav = screen.getByRole("navigation", { name: navigation.label })
    expect(within(nav).getByRole("link", { name: navigationAuthMessages.app.settings })).toHaveAttribute("aria-current", "page")
    expect(within(nav).getByRole("link", { name: navigationAuthMessages.app.overview })).not.toHaveAttribute("aria-current")
    expect(within(screen.getByRole("banner")).getByText(navigationAuthMessages.app.overview)).toBeVisible()
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
    await user.click(within(nav).getByRole("link", { name: navigationAuthMessages.app.settings }))
    expect(await screen.findByRole("heading", { level: 1, name: pagesAppSettingsMessages.metadata.title })).toBeVisible()
    await user.click(screen.getByRole("link", { name: APP_NAME }))
    expect(await screen.findByRole("heading", { name: pagesAppMessages.metadata.title })).toBeVisible()
    await user.click(screen.getByRole("link", { name: navigationContentMessages.appResources.docs }))
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

  it("removes the cached session and account data, keeps the translations, and opens sign in after successful sign-out", async () => {
    const { queryClient, router, user } = await renderApp(ROUTES.APP)
    await user.click(await screen.findByRole("button", { name: commonMessages.signOut }))

    expect(await screen.findByRole("heading", { name: "Sign in required" })).toBeVisible()
    expect(router.state.location.pathname).toBe(ROUTES.SIGN_IN)
    expect(signOutMock).toHaveBeenCalledOnce()
    expect(queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toBeUndefined()
    expect(queryClient.getQueryData(SUMMARY_QUERY_KEY)).toBeUndefined()
    expect(queryClient.getMutationCache().getAll()).toHaveLength(0)
    expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "pages.app.sidebar" }).queryKey)).toBeDefined()
    expect(toast.success).toHaveBeenCalledWith(commonMessages.signedOut)
    expect(toast.error).not.toHaveBeenCalled()
  })

  it("keeps the cached session and account data when sign-out fails and shows the localized error", async () => {
    signOutMock.mockRejectedValue(new Error("Connection failed"))
    const session = createAuthSessionFixture()
    const { queryClient, router, user } = await renderApp(ROUTES.APP, "pl-PL")
    await user.click(await screen.findByRole("button", { name: plCommonMessages.signOut }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(plErrorMessages.codes.INTERNAL_ERROR)
    })
    expect(queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toStrictEqual(session)
    expect(queryClient.getQueryData(SUMMARY_QUERY_KEY)).toStrictEqual(SUMMARY)
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
    expect(queryClient.getQueryData(SUMMARY_QUERY_KEY)).toBeUndefined()
  })
})
