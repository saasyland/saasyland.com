import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRoute, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { TranslationsProvider } from "~/src/providers/translations-provider"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { Route as RootRoute } from "~/src/routes/__root"

import { ROBOTS } from "~/src/lib/seo"
import { isStaleBuildError } from "~/src/lib/stale-build"

import sonnerMessages from "~/messages/pl-PL/components.shadcn.sonner.json"
import { ROUTES } from "~/src/routes"

const AreaWidget = vi.hoisted(() => () => <p>Mounted by an area</p>)

vi.mock("~/src/data/root.entries", () => ({ TEST_ROOT_COMPONENTS: [{ component: AreaWidget, key: "areaWidget" }] }))

beforeEach(() => {
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
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

const renderRoot = async () => {
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
  return router
}

const failPreload = (error: Error): void => {
  globalThis.dispatchEvent(Object.assign(new Event("vite:preloadError"), { payload: error }))
}

it.each([
  { mode: ENVIRONMENT.PRODUCTION, robots: ROBOTS.FULL_PREVIEWS },
  { mode: ENVIRONMENT.PREVIEW, robots: ROBOTS.NON_PRODUCTION },
  { mode: ENVIRONMENT.TEST, robots: ROBOTS.NON_PRODUCTION },
])("asks search engines for $robots in a $mode build", async ({ mode, robots }) => {
  vi.stubEnv("MODE", mode)
  const router = await renderRoot()

  expect(router.state.matches.at(0)?.meta).toContainEqual({ content: robots, name: "robots" })
})

it("mounts the components the areas add to the root beside every page", async () => {
  await renderRoot()

  expect(await screen.findByRole("heading", { level: 1, name: "Home page" })).toBeVisible()
  expect(screen.getByText("Mounted by an area")).toBeInTheDocument()
})

it("names the notifications region in the page's language", async () => {
  vi.mocked(getRequest).mockReturnValue(new Request("http://127.0.0.1:3000/pl-PL"))
  await renderRoot()

  expect(await screen.findByRole("region", { name: `${sonnerMessages.label} alt+T` })).toBeInTheDocument()
})

it("remembers the files Vite fails to preload while the application is open", async () => {
  await renderRoot()
  const whileOpen = new Error("Unable to preload CSS for http://127.0.0.1:3000/assets/video-player-CQyycmlF.css")
  failPreload(whileOpen)
  cleanup()
  const afterClosing = new Error("Unable to preload CSS for http://127.0.0.1:3000/assets/docs-B1yvD2kQ.css")
  failPreload(afterClosing)

  expect(isStaleBuildError(whileOpen)).toBe(true)
  expect(isStaleBuildError(afterClosing)).toBe(false)
})
