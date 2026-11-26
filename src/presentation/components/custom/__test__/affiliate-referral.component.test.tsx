import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRoute, createRouter } from "@tanstack/react-router"
import { act, render, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TranslationsProvider } from "~/src/providers/translations-provider"

import { AFFONSO } from "~/src/integrations/affonso/affonso.constants"
import * as affonsoProgram from "~/src/integrations/affonso/affonso.program"

import { Route as RootRoute } from "~/src/routes/__root"

import { AFFILIATE_TERMS } from "~/src/data/affiliates"
import { FEATURE_STATUS, type FeatureStatus } from "~/src/data/navigation.constants"

import { AffiliateReferral } from "~/src/presentation/components/custom/affiliate-referral"

import { ROUTES } from "~/src/routes"

const affiliateProgram = vi.hoisted(() => vi.fn<() => FeatureStatus>())

vi.mock(import("~/src/data/affiliates"), async (importOriginal) => ({
  ...(await importOriginal()),
  get AFFILIATE_PROGRAM() {
    return affiliateProgram()
  },
}))

const PROGRAM_ID = "cmh7q6ayf0000jz08program"
const PIXEL_SELECTOR = `script[src="${AFFONSO.PIXEL_URL}"]`

const visit = (path: string): void => {
  globalThis.history.replaceState(null, "", path)
}

const programId = (value: string | undefined) => vi.spyOn(affonsoProgram, "getAffonsoProgramId").mockResolvedValue(value)

const renderRoot = async (): Promise<void> => {
  Reflect.deleteProperty(RootRoute.options, "shellComponent")
  const home = createRoute({ component: () => <h1>Home page</h1>, getParentRoute: () => RootRoute, path: ROUTES.HOME })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const router = createRouter({
    InnerWrap: TranslationsProvider,
    context: { queryClient },
    history: createMemoryHistory({ initialEntries: [ROUTES.HOME] }),
    routeTree: RootRoute.addChildren([home]),
  })

  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  await act(() => router.load())
}

beforeEach(() => {
  affiliateProgram.mockReturnValue(FEATURE_STATUS.AVAILABLE)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  visit("/")
})

describe("affiliate referral", () => {
  it("asks the server nothing and loads no script on a visit without a referral", () => {
    const getProgramId = programId(PROGRAM_ID)
    visit("/blog?utm_source=newsletter")

    render(<AffiliateReferral />)

    expect(getProgramId).not.toHaveBeenCalled()
    expect(document.querySelector(PIXEL_SELECTOR)).toBeNull()
  })

  it.each(AFFONSO.REFERRAL_PARAMS)("recognises ?%s= as a referral and loads nothing where no program is configured", async (param) => {
    const getProgramId = programId(undefined)
    visit(`/blog?${param}=jane`)

    render(<AffiliateReferral />)

    await waitFor(() => {
      expect(getProgramId).toHaveBeenCalledOnce()
    })
    expect(document.querySelector(PIXEL_SELECTOR)).toBeNull()
  })

  it("asks the server nothing and loads no script while the programme is arriving, even on a referral", () => {
    affiliateProgram.mockReturnValue(FEATURE_STATUS.ARRIVING)
    const getProgramId = programId(PROGRAM_ID)
    visit("/?via=jane")

    render(<AffiliateReferral />)

    expect(getProgramId).not.toHaveBeenCalled()
    expect(document.querySelector(PIXEL_SELECTOR)).toBeNull()
  })

  it("loads Affonso's script with the program ID and the published cookie duration", async () => {
    programId(PROGRAM_ID)
    visit("/?via=jane")

    render(<AffiliateReferral />)

    await waitFor(() => {
      expect(document.querySelector(PIXEL_SELECTOR)).not.toBeNull()
    })
    const script = document.querySelector(PIXEL_SELECTOR)
    expect(script).toHaveAttribute("data-affonso", PROGRAM_ID)
    expect(script).toHaveAttribute("data-cookie_duration", String(AFFILIATE_TERMS.COOKIE_DAYS))
    expect(script).toHaveAttribute("async")
  })

  it("is mounted by the root route beside every page", async () => {
    vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {})
    vi.stubGlobal(
      "matchMedia",
      vi.fn((query: string) => ({ addEventListener: vi.fn(), matches: false, media: query, removeEventListener: vi.fn() })),
    )
    const getProgramId = programId(undefined)
    visit("/?via=jane")

    await renderRoot()

    await waitFor(() => {
      expect(getProgramId).toHaveBeenCalledOnce()
    })
  })
})
