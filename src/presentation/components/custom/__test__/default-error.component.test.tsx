import { QueryClient, queryOptions, useSuspenseQuery } from "@tanstack/react-query"
import { Link, Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { DefaultError } from "~/src/presentation/components/custom/default-error"
import { DefaultPending } from "~/src/presentation/components/custom/default-pending"

const renderFailure = (failure: "root" | "loader" | "render") => {
  const error = new Error("private database details")
  const load = vi.fn<() => Promise<string>>().mockRejectedValueOnce(error).mockResolvedValue("Recovered data")
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const query = queryOptions({ queryFn: load, queryKey: ["route-data"] })
  const Page = () => <p>{useSuspenseQuery(query).data}</p>
  const root = createRootRoute({
    beforeLoad: async () => {
      if (failure === "root") {
        await queryClient.query(query)
      }
    },
    component: () => (
      <>
        <nav aria-label="Workspace">
          <Link to="/">Data</Link>
          <Link to="/privacy">Other page</Link>
        </nav>
        <Outlet />
      </>
    ),
  })
  const index = createRoute({
    component: Page,
    getParentRoute: () => root,
    loader: () => (failure === "loader" ? queryClient.query(query) : undefined),
    path: "/",
  })
  const other = createRoute({ component: () => <p>Other content</p>, getParentRoute: () => root, path: "/privacy" })
  const router = createRouter({
    defaultErrorComponent: DefaultError,
    defaultPendingComponent: DefaultPending,
    defaultPendingMinMs: 0,
    defaultPendingMs: 0,
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: root.addChildren([index, other]),
  })
  setupRouterSsrQueryIntegration({ queryClient, router })
  const log = vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  render(<RouterProvider router={router} />)
  return { error, load, log }
}

beforeEach(() => vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

it.each(["root", "loader", "render"] as const)(
  "retries a %s failure through the router without exposing private details",
  async (failure) => {
    const { error, load, log } = renderFailure(failure)
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong")
    expect(screen.getByRole("alert")).not.toHaveTextContent(error.message)
    expect(log).toHaveBeenCalledWith(error)
    if (failure !== "root") {
      expect(screen.getByRole("navigation", { name: "Workspace" })).toBeVisible()
    }

    await userEvent.click(screen.getByRole("button", { name: "Reload" }))
    expect(await screen.findByText("Recovered data")).toBeVisible()
    expect(screen.queryByRole("alert")).not.toBeInTheDocument()
    expect(load).toHaveBeenCalledTimes(2)
  },
)

it("retries a failed query when returning through navigation without pressing reload", async () => {
  const { load } = renderFailure("render")
  expect(await screen.findByRole("alert")).toBeVisible()
  await userEvent.click(screen.getByRole("link", { name: "Other page" }))
  expect(await screen.findByText("Other content")).toBeVisible()
  await userEvent.click(screen.getByRole("link", { name: "Data" }))
  expect(await screen.findByText("Recovered data")).toBeVisible()
  expect(load).toHaveBeenCalledTimes(2)
})
