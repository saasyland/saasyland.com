import { QueryClient, queryOptions, useSuspenseQuery } from "@tanstack/react-query"
import { Link, Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { act, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, expect, it, onTestFinished, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { claimReload, listenForStaleBuilds } from "~/src/lib/stale-build"

import { DefaultError } from "~/src/presentation/components/custom/default-error"

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
          <Link params={{ _splat: "other" }} to="/$">
            Other page
          </Link>
        </nav>
        <Outlet />
      </>
    ),
  })
  const index = createRoute({
    component: Page,
    getParentRoute: () => root,
    loader: async () => {
      if (failure === "loader") {
        await queryClient.query(query)
      }
    },
    path: "/",
  })
  const other = createRoute({ component: () => <p>Other content</p>, getParentRoute: () => root, path: "/$" })
  const router = createRouter({
    defaultErrorComponent: DefaultError,
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: root.addChildren([index, other]),
  })
  setupRouterSsrQueryIntegration({ queryClient, router })
  const log = vi.spyOn(console, "error").mockImplementation(() => {})
  vi.spyOn(console, "warn").mockImplementation(() => {})
  render(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
      <RouterProvider router={router} />
    </IntlProvider>,
  )
  return { error, load, log }
}

const DESTINATION = "/blog"

const MISSING_CHUNK = new TypeError(
  "Failed to fetch dynamically imported module: http://localhost:3000/assets/_site._marketing.blog-BLaFCBnh.js",
)

const MISSING_STYLESHEET = new Error("Unable to preload CSS for http://localhost:3000/assets/video-player-CQyycmlF.css")

const RELOAD = { href: DESTINATION, ignoreBlocker: true, reloadDocument: true, replace: true }

const renderStaleBuild = (error: Error) => {
  const root = createRootRoute({ component: Outlet })
  const home = createRoute({ component: () => <p>Home content</p>, getParentRoute: () => root, path: "/" })
  const blog = createRoute({
    component: () => <p>Blog content</p>,
    getParentRoute: () => root,
    loader: () => Promise.reject(error),
    path: DESTINATION,
  })
  const router = createRouter({
    defaultErrorComponent: DefaultError,
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: root.addChildren([home, blog]),
  })
  const navigate = vi.spyOn(router, "navigate").mockResolvedValue()
  vi.spyOn(console, "error").mockImplementation(() => {})
  render(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
      <RouterProvider router={router} />
    </IntlProvider>,
  )
  return { navigate, router }
}

const failPreload = (error: Error): void => {
  globalThis.dispatchEvent(Object.assign(new Event("vite:preloadError"), { payload: error }))
}

beforeEach(() => vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {}))
afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
})

it.each(["root", "loader", "render"] as const)(
  "retries a %s failure through the router without exposing private details",
  async (failure) => {
    const { error, load, log } = renderFailure(failure)
    expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong")
    expect(screen.getByRole("heading", { level: 1, name: "Something went wrong" })).toBeVisible()
    expect(screen.queryByRole("main")).not.toBeInTheDocument()
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

it.each([
  ["its code", MISSING_CHUNK],
  ["a stylesheet Vite preloads for it", MISSING_STYLESHEET],
])("loads the destination as a new page when a newer deploy removed %s", async (_, error) => {
  onTestFinished(listenForStaleBuilds())
  failPreload(MISSING_STYLESHEET)
  const { navigate, router } = renderStaleBuild(error)
  expect(await screen.findByText("Home content")).toBeVisible()

  act(() => {
    router.history.push(DESTINATION)
  })

  await waitFor(() => {
    expect(navigate).toHaveBeenCalledWith(RELOAD)
  })
  expect(document.querySelector("[data-slot=default-error]")).toHaveAttribute("aria-busy", "true")
  expect(screen.queryByRole("alert")).not.toBeInTheDocument()
})

it("leaves a visitor who is going to another page alone and loads the page again only when they stay", async () => {
  onTestFinished(listenForStaleBuilds())
  failPreload(MISSING_STYLESHEET)
  const { navigate, router } = renderStaleBuild(MISSING_STYLESHEET)
  expect(await screen.findByText("Home content")).toBeVisible()
  globalThis.dispatchEvent(new Event("beforeunload"))

  act(() => {
    router.history.push(DESTINATION)
  })

  await waitFor(() => {
    expect(document.querySelector("[data-slot=default-error]")).toHaveAttribute("aria-busy", "true")
  })
  expect(navigate).not.toHaveBeenCalled()
  globalThis.dispatchEvent(new Event("pageshow"))
  expect(navigate).toHaveBeenCalledWith(RELOAD)
})

it("shows the error page when the destination's code is still missing after its reload", async () => {
  claimReload(DESTINATION)
  const { navigate, router } = renderStaleBuild(MISSING_CHUNK)
  expect(await screen.findByText("Home content")).toBeVisible()

  act(() => {
    router.history.push(DESTINATION)
  })

  expect(await screen.findByRole("alert")).toHaveTextContent("Something went wrong")
  expect(navigate).not.toHaveBeenCalled()
})

it("keeps the reload for the navigation when a preload of the destination failed first", async () => {
  const { navigate, router } = renderStaleBuild(MISSING_CHUNK)
  expect(await screen.findByText("Home content")).toBeVisible()

  await act(() => router.preloadRoute({ to: DESTINATION }))
  expect(navigate).not.toHaveBeenCalled()
  expect(screen.getByText("Home content")).toBeVisible()
  act(() => {
    router.history.push(DESTINATION)
  })

  await waitFor(() => {
    expect(navigate).toHaveBeenCalledWith(RELOAD)
  })
})
