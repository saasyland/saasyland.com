import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { TranslationsProvider } from "~/src/providers/translations-provider"

import { Route as RootRoute } from "~/src/routes/__root"
import { Route as AuthRoute } from "~/src/routes/auth"
import { Route as SignInRoute } from "~/src/routes/auth.sign-in"

import authErrorsMessages from "~/messages/en-US/auth.errors.json"
import pagesAuthSignInMessages from "~/messages/en-US/pages.auth.sign-in.json"
import plAuthErrorsMessages from "~/messages/pl-PL/auth.errors.json"
import plPagesAuthSignInMessages from "~/messages/pl-PL/pages.auth.sign-in.json"
import { ROUTES } from "~/src/routes"

const SIGN_IN_SEGMENT = ROUTES.SIGN_IN.slice(ROUTES.AUTH.length)

const sessionRequest = vi.hoisted(() => vi.fn())

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})

const renderSignIn = async (search: string, title = pagesAuthSignInMessages.form.title) => {
  Reflect.deleteProperty(RootRoute.options, "shellComponent")
  Object.assign(AuthRoute.options, { getParentRoute: () => RootRoute, id: ROUTES.AUTH, path: ROUTES.AUTH })
  Object.assign(SignInRoute.options, { getParentRoute: () => AuthRoute, id: SIGN_IN_SEGMENT, path: SIGN_IN_SEGMENT })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    InnerWrap: TranslationsProvider,
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [`${ROUTES.SIGN_IN}${search}`] }),
    routeTree: RootRoute.addChildren([AuthRoute.addChildren([SignInRoute])]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await act(() => router.load())
  expect(await screen.findByRole("heading", { level: 1, name: title })).toBeVisible()
}

beforeEach(() => {
  sessionRequest.mockReset().mockResolvedValue(JSON_NULL)
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

describe("sign-in redirect errors", () => {
  it.each([
    ["access_denied", authErrorsMessages.signInCancelled],
    ["state_mismatch", authErrorsMessages.socialSignInFailed],
    ["BANNED_USER", authErrorsMessages.accountSuspended],
    ["account_not_linked", authErrorsMessages.accountNotLinked],
  ])("announces %s as translated copy", async (error, message) => {
    await renderSignIn(`?error=${error}`)

    expect(screen.getByRole("alert")).toHaveTextContent(message)
  })

  it("maps an API code forwarded by the OAuth callback and ignores the provider description", async () => {
    await renderSignIn("?error=BANNED_USER&error_description=Call%20%2B1%20555%200100")

    expect(screen.getByRole("alert")).toHaveTextContent(authErrorsMessages.accountSuspended)
    expect(screen.queryByText(/555 0100/u)).not.toBeInTheDocument()
  })

  it("never echoes an unrecognised code from the URL", async () => {
    await renderSignIn("?error=Your%20account%20is%20locked.%20Call%20%2B1%20555%200100")

    expect(screen.getByRole("alert")).toHaveTextContent(authErrorsMessages.unknownError)
    expect(screen.queryByText(/555 0100/u)).not.toBeInTheDocument()
  })

  it.each(["", "?error="])("shows no alert without a redirect error: %j", async (search) => {
    await renderSignIn(search)

    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
  })

  it("uses the visitor's locale", async () => {
    vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000/pl-PL${ROUTES.SIGN_IN}`))
    await renderSignIn("?error=access_denied", plPagesAuthSignInMessages.form.title)

    expect(screen.getByRole("alert")).toHaveTextContent(plAuthErrorsMessages.signInCancelled)
  })

  it("accepts only a string error from the URL", () => {
    const validate = SignInRoute.options.validateSearch
    if (typeof validate !== "function") {
      throw new TypeError("The sign-in route must validate its URL search values")
    }

    expect(validate({ error: "state_mismatch", tier: "agency" })).toEqual({ error: "state_mismatch" })
    expect(validate({ error: ["access_denied"] })).toEqual({ error: undefined })
    expect(validate({})).toEqual({ error: undefined })
  })
})
