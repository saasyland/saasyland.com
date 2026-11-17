import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { RouterProvider, createMemoryHistory, createRoute, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { TranslationsProvider } from "~/src/providers/translations-provider"

import { Route as RootRoute } from "~/src/routes/__root"

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
})

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
