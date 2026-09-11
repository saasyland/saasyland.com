import { renderToStaticMarkup } from "react-dom/server"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import {
  type RootRouteOptions,
  RouterContextProvider,
  RouterProvider,
  createMemoryHistory,
  createRoute,
  createRouter,
} from "@tanstack/react-router"
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { messagesQueryOptions } from "~/src/integrations/use-intl/i18n.messages"

import { Route as RootRoute } from "~/src/routes/__root"
import { Route as AuthRoute } from "~/src/routes/auth"
import { Route as CallbackRoute } from "~/src/routes/auth.callback"
import { Route as ForgotPasswordRoute } from "~/src/routes/auth.forgot-password"
import { Route as ResetPasswordRoute } from "~/src/routes/auth.reset-password"
import { Route as SignInRoute } from "~/src/routes/auth.sign-in"
import { Route as SignUpRoute } from "~/src/routes/auth.sign-up"
import { Route as TwoFactorRoute } from "~/src/routes/auth.two-factor"
import { Route as VerifyEmailRoute } from "~/src/routes/auth.verify-email"

import { ROUTES } from "~/src/routes"

const sessionRequest = vi.hoisted(() => vi.fn())
const messages = getTestMessages("en-US")

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})

const rootOptions: Pick<RootRouteOptions, "component" | "shellComponent"> = RootRoute.options
const RootShell = rootOptions.shellComponent

const createAuthRouter = (path: string) => {
  const root = RootRoute
  Reflect.deleteProperty(root.options, "shellComponent")
  Object.assign(AuthRoute.options, { getParentRoute: () => root, id: "/auth", path: "/auth" })
  const children = [
    ["callback", CallbackRoute],
    ["forgot-password", ForgotPasswordRoute],
    ["reset-password", ResetPasswordRoute],
    ["sign-in", SignInRoute],
    ["sign-up", SignUpRoute],
    ["two-factor", TwoFactorRoute],
    ["verify-email", VerifyEmailRoute],
  ] as const
  for (const [routePath, route] of children) {
    Object.assign(route.options, { getParentRoute: () => AuthRoute, id: `/${routePath}`, path: `/${routePath}` })
  }
  const home = createRoute({ component: () => <h1>Website home</h1>, getParentRoute: () => root, path: "/" })
  const app = createRoute({ component: () => <h1>Customer workspace</h1>, getParentRoute: () => root, path: "/app" })
  const admin = createRoute({ component: () => <h1>Admin workspace</h1>, getParentRoute: () => root, path: "/admin" })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const authChildren = children.map(([, route]) => route)
  const routeTree = root.addChildren([home, app, admin, AuthRoute.addChildren(authChildren)])
  const router = createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    routeTree,
  })
  return { queryClient, router }
}

const renderAuth = async (path: string) => {
  const { queryClient, router } = createAuthRouter(path)
  const view = render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { ...view, queryClient, router }
}

beforeEach(() => {
  sessionRequest.mockReset().mockResolvedValue(JSON_NULL)
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

afterEach(() => vi.unstubAllEnvs())

it("includes a themed, accessible document shell and keeps production pages indexable", async () => {
  vi.stubEnv("MODE", "production")
  const { queryClient, router } = createAuthRouter(ROUTES.HOME)
  await router.load()
  expect(router.state.matches[0]?.meta).not.toContainEqual({ content: "noindex, nofollow", name: "robots" })
  if (!RootShell) {
    throw new Error("The root route must provide an HTML document shell")
  }
  const html = renderToStaticMarkup(
    <QueryClientProvider client={queryClient}>
      <RouterContextProvider router={router}>
        <RootShell>
          <p>Application content</p>
        </RootShell>
      </RouterContextProvider>
    </QueryClientProvider>,
  )
  expect(html).toContain('<html lang="en-US" dir="ltr"')
  expect(html).toContain("Application content")
  expect(html).toContain("localStorage")
  expect(html).toContain('name="viewport"')
})
describe("authentication routes", () => {
  it.each([
    [ROUTES.SIGN_IN, "sign-in"],
    [ROUTES.SIGN_UP, "sign-up"],
    [ROUTES.FORGOT_PASSWORD, "forgot-password"],
    [ROUTES.RESET_PASSWORD, "reset-password"],
    [ROUTES.TWO_FACTOR, "two-factor"],
    [ROUTES.VERIFY_EMAIL, "verify-email"],
  ] as const)("renders %s with its translated heading, navigation, and route metadata", async (path, namespace) => {
    const { queryClient, router } = await renderAuth(path)
    expect(await screen.findByRole("heading", { level: 1, name: messages.pages.auth[namespace].form.title })).toBeVisible()
    expect(screen.getByRole("link", { name: messages.auth.layout.backToHome })).toHaveAttribute("href", ROUTES.HOME)
    expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: `pages.auth.${namespace}` }).queryKey)).toBeDefined()
    expect(router.state.matches.at(-1)?.meta).toEqual(expect.arrayContaining([expect.objectContaining({ name: "description" })]))
    expect(router.state.matches[0]?.meta).toContainEqual({ content: "noindex, nofollow", name: "robots" })
  })

  it("uses new-account copy and legal links on signup, and returning-account copy on sign in", async () => {
    const { router } = await renderAuth(ROUTES.SIGN_UP)
    expect(await screen.findByText(messages.auth.gate.signUpHeadline)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Terms of Service" })).toHaveAttribute("href", ROUTES.TERMS)
    expect(screen.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute("href", ROUTES.PRIVACY)
    expect(screen.getByRole("button", { name: "Continue with Google" })).toBeVisible()
    expect(screen.getByRole("button", { name: "Continue with GitHub" })).toBeVisible()
    await act(() => router.navigate({ to: ROUTES.SIGN_IN }))
    expect(await screen.findByText(messages.auth.gate.headline)).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Sign up" })).toHaveAttribute("href", ROUTES.SIGN_UP)
  })

  it.each([
    [ROUTES.SIGN_IN, "customer", "Customer workspace"],
    [ROUTES.SIGN_UP, "admin", "Admin workspace"],
    [ROUTES.AUTH_CALLBACK, "customer", "Customer workspace"],
    [ROUTES.AUTH_CALLBACK, "admin", "Admin workspace"],
  ])("redirects a signed-in %s visitor with role %s to their workspace", async (path, role, heading) => {
    sessionRequest.mockResolvedValue(createAuthSessionFixture({ role }))
    await renderAuth(path)
    expect(await screen.findByRole("heading", { name: heading })).toBeVisible()
    expect(sessionRequest).toHaveBeenCalledOnce()
  })

  it("sends an expired callback session back to sign in", async () => {
    const { router } = await renderAuth(ROUTES.AUTH_CALLBACK)
    expect(await screen.findByRole("heading", { name: messages.pages.auth["sign-in"].form.title })).toBeVisible()
    expect(router.state.location.pathname).toBe(ROUTES.SIGN_IN)
    expect(router.options.context.queryClient.getQueryData(getCurrentSessionQuery.queryKey)).toBeNull()
  })

  it.each([
    ["", messages.pages.auth["reset-password"].form.invalidToken],
    ["?error=Expired%20link&token=otherwise-valid", "Expired link"],
  ])("offers a fresh reset link when the password link is invalid: %s", async (search, error) => {
    await renderAuth(`${ROUTES.RESET_PASSWORD}${search}`)
    expect(await screen.findByText(error)).toBeVisible()
    expect(screen.getByRole("link", { name: messages.pages.auth["reset-password"].form.requestNewLink })).toHaveAttribute(
      "href",
      ROUTES.FORGOT_PASSWORD,
    )
    expect(screen.queryByTestId("reset-password-form-submit-button")).not.toBeInTheDocument()
  })

  it("accepts a valid reset token and exposes the password form", async () => {
    await renderAuth(`${ROUTES.RESET_PASSWORD}?token=valid-reset-token`)
    expect(await screen.findByTestId("reset-password-form-submit-button")).toBeEnabled()
    expect(screen.queryByText(messages.pages.auth["reset-password"].form.invalidToken)).not.toBeInTheDocument()
  })

  it("validates untrusted search values before rendering auth pages", () => {
    const signup = SignUpRoute.options.validateSearch
    const reset = ResetPasswordRoute.options.validateSearch
    const verify = VerifyEmailRoute.options.validateSearch
    if (typeof signup !== "function" || typeof reset !== "function" || typeof verify !== "function") {
      throw new TypeError("Auth routes must validate their URL search values")
    }
    expect(signup({ tier: "agency" })).toEqual({ tier: "agency" })
    expect(signup({ tier: 123 })).toEqual({ tier: undefined })
    expect(reset({ token: "valid", error: false })).toEqual({ token: "valid" })
    expect(verify({ email: 4, error: false, token: {}, verified: "false" })).toEqual({
      email: "",
      error: "",
      token: "",
      verified: false,
    })
    expect(verify({ email: "person@example.com", error: "expired", token: "token", verified: true })).toEqual({
      email: "person@example.com",
      error: "expired",
      token: "token",
      verified: true,
    })
  })

  it("does not consume a verification token when the link is prefetched", async () => {
    const { router } = await renderAuth(ROUTES.HOME)
    const matches = await act(() =>
      router.preloadRoute({
        search: () => ({ email: "", error: "", token: "verification-token", verified: false }),
        to: ROUTES.VERIFY_EMAIL,
      }),
    )
    expect(matches?.at(-1)).toMatchObject({
      loaderData: { metadata: { pathname: ROUTES.VERIFY_EMAIL } },
      routeId: "/auth/verify-email",
      status: "success",
    })
    expect(router.state.location.pathname).toBe(ROUTES.HOME)
    expect(screen.getByRole("heading", { name: "Website home" })).toBeVisible()
  })

  it("hands the verification token to Better Auth with the application callback URL", async () => {
    const { router } = createAuthRouter(`${ROUTES.VERIFY_EMAIL}?token=token%2Bwith%26symbols`)
    const navigate = vi.spyOn(router, "navigate").mockResolvedValue()
    await router.load()
    expect(navigate).toHaveBeenCalledWith(expect.objectContaining({ reloadDocument: true, replace: true }))
    const destination = navigate.mock.calls.at(0)?.[0]?.href
    expect(destination).toBeDefined()
    const redirect = new URL(destination ?? "", "https://saasyland.com")
    expect(redirect.pathname).toBe(ROUTES.API_AUTH_VERIFY_EMAIL)
    expect(redirect.searchParams.get("token")).toBe("token+with&symbols")
    expect(redirect.searchParams.get("callbackURL")).toBe(`${ROUTES.VERIFY_EMAIL}?verified=true`)
  })

  it("redirects verified accounts through the guarded callback", async () => {
    sessionRequest.mockResolvedValue(createAuthSessionFixture())
    const { router } = await renderAuth(`${ROUTES.VERIFY_EMAIL}?verified=true`)
    expect(await screen.findByRole("heading", { name: "Customer workspace" })).toBeVisible()
    expect(router.state.location.pathname).toBe(ROUTES.APP)
  })

  it("keeps a rejected verification link on the recovery panel", async () => {
    const { router } = await renderAuth(`${ROUTES.VERIFY_EMAIL}?verified=true&error=expired&email=person%40example.com`)
    expect(await screen.findByRole("heading", { name: messages.pages.auth["verify-email"].form.title })).toBeVisible()
    expect(router.state.location.pathname).toBe(ROUTES.VERIFY_EMAIL)
    expect(screen.getByText(messages.pages.auth["verify-email"].form.invalidToken)).toBeVisible()
    expect(document.querySelector('input[name="email"]')).toHaveValue("person@example.com")
  })
})
