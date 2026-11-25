import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, render, screen } from "@testing-library/react"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { JSON_NULL } from "~/src/platform/testing/lib/json-null"

import { TranslationsProvider } from "~/src/providers/translations-provider"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"

import { Route as RootRoute } from "~/src/routes/__root"
import { Route as AuthRoute } from "~/src/routes/auth"
import { Route as SignUpRoute } from "~/src/routes/auth.sign-up"

import pricingMessages from "~/messages/en-US/components.custom.pricing.json"
import pagesAuthSignUpMessages from "~/messages/en-US/pages.auth.sign-up.json"
import plPricingMessages from "~/messages/pl-PL/components.custom.pricing.json"
import plPagesAuthSignUpMessages from "~/messages/pl-PL/pages.auth.sign-up.json"
import * as ROUTES from "~/src/routes"

const SIGN_UP_SEGMENT = ROUTES.SIGN_UP.slice(ROUTES.AUTH.length)

const sessionRequest = vi.hoisted(() => vi.fn())

vi.mock(import("~/src/integrations/better-auth/auth.session"), async (importOriginal) => {
  const actual = await importOriginal()
  return { ...actual, getCurrentSessionQuery: { ...actual.getCurrentSessionQuery, queryFn: sessionRequest } }
})

const signUpWith = (redirect: string): string => `?${new URLSearchParams({ redirect }).toString()}`

const tierRedirect = (path: string, tier: string): string => `${path}?${new URLSearchParams({ tier }).toString()}`

const renderSignUp = async (search: string, title = pagesAuthSignUpMessages.form.title) => {
  Reflect.deleteProperty(RootRoute.options, "shellComponent")
  Object.assign(AuthRoute.options, { getParentRoute: () => RootRoute, id: ROUTES.AUTH, path: ROUTES.AUTH })
  Object.assign(SignUpRoute.options, { getParentRoute: () => AuthRoute, id: SIGN_UP_SEGMENT, path: SIGN_UP_SEGMENT })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    InnerWrap: TranslationsProvider,
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [`${ROUTES.SIGN_UP}${search}`] }),
    routeTree: RootRoute.addChildren([AuthRoute.addChildren([SignUpRoute])]),
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

describe("sign-up intro", () => {
  it("sums up the order in place of the description when the redirect carries a tier", async () => {
    await renderSignUp(signUpWith(tierRedirect(ROUTES.APP, LICENSE_TIER.COMPLETE)))

    expect(screen.getByRole("heading", { level: 2, name: new RegExp(`^${pricingMessages.tiers.complete.name}`, "u") })).toBeVisible()
    expect(screen.queryByText(pagesAuthSignUpMessages.form.description)).not.toBeInTheDocument()
  })

  it.each([
    { label: "no redirect", search: "" },
    { label: "a redirect without a tier", search: signUpWith(ROUTES.APP) },
    { label: "a redirect with an unknown tier", search: signUpWith(tierRedirect(ROUTES.APP, "enterprise")) },
    {
      label: "a redirect to a page that sells no tier",
      search: signUpWith(tierRedirect(ROUTES.APP_SETTINGS, LICENSE_TIER.COMPLETE)),
    },
    { label: "an external redirect", search: signUpWith(tierRedirect(`https://evil.example${ROUTES.APP}`, LICENSE_TIER.COMPLETE)) },
  ])("keeps the description with $label", async ({ search }) => {
    await renderSignUp(search)

    expect(screen.getByText(pagesAuthSignUpMessages.form.description)).toBeVisible()
    expect(screen.queryByRole("heading", { level: 2 })).not.toBeInTheDocument()
  })

  it("sums up the order in the visitor's locale for a locale-prefixed redirect", async () => {
    vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000/pl-PL${ROUTES.SIGN_UP}`))
    await renderSignUp(signUpWith(tierRedirect(`/pl-PL${ROUTES.APP}`, LICENSE_TIER.AGENCY)), plPagesAuthSignUpMessages.form.title)

    expect(screen.getByRole("heading", { level: 2, name: new RegExp(`^${plPricingMessages.tiers.agency.name}`, "u") })).toBeVisible()
    expect(screen.queryByText(plPagesAuthSignUpMessages.form.description)).not.toBeInTheDocument()
  })
})
