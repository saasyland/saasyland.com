import { QueryClient, queryOptions } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRoute, createRoute, createRouter } from "@tanstack/react-router"
import { setupRouterSsrQueryIntegration } from "@tanstack/react-router-ssr-query"
import { createColumnHelper } from "@tanstack/react-table"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { DataTable, type DataTableFeatures, type DataTableOptions } from "~/src/presentation/components/custom/data-table"
import { DefaultError } from "~/src/presentation/components/custom/default-error"

import errorsGlobalMessages from "~/messages/en-US/errors.global.json"

interface Person {
  id: string
  name: string
}

interface Page {
  rows: Person[]
  total: number
}
type TableQuery = NonNullable<DataTableOptions<Person>["query"]>
type Request = Parameters<TableQuery>[0]

const helper = createColumnHelper<DataTableFeatures, Person>()
const columns = helper.columns([helper.accessor("name", { header: "Name", id: "name" })])
const messages = getTestMessages("en-US")
const firstPage: Page = {
  rows: [
    { id: "grace", name: "Grace" },
    { id: "ada", name: "Ada" },
  ],
  total: 3,
}
const lastPage: Page = { rows: [{ id: "alan", name: "Alan" }], total: 3 }

const renderTable = async (fetchPage: (state: Request) => Promise<Page>, options: DataTableOptions<Person> = {}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  const root = createRootRoute({
    component: () => (
      <IntlProvider locale="en-US" messages={messages}>
        <Outlet />
      </IntlProvider>
    ),
  })
  const index = createRoute({
    component: () => (
      <DataTable
        columns={columns}
        options={{
          initialState: { pagination: { pageIndex: 0, pageSize: 2 } },
          query: (state) => queryOptions<Page>({ queryFn: () => fetchPage(state), queryKey: ["people", state] }),
          ...options,
        }}
      />
    ),
    getParentRoute: () => root,
    path: "/",
  })
  const router = createRouter({
    defaultErrorComponent: DefaultError,
    history: createMemoryHistory({ initialEntries: ["/"] }),
    routeTree: root.addChildren([index]),
  })
  setupRouterSsrQueryIntegration({ queryClient, router })
  await router.load()
  return { ...render(<RouterProvider router={router} />), queryClient }
}

beforeEach(() => vi.spyOn(globalThis, "scrollTo").mockImplementation(() => {}))
afterEach(() => vi.restoreAllMocks())

describe("data table server queries", () => {
  it("loads its initial state and leaves server ordering and pagination intact", async () => {
    const fetchPage = vi.fn<(state: Request) => Promise<Page>>().mockResolvedValue(firstPage)
    await renderTable(fetchPage, { initialState: { pagination: { pageIndex: 1, pageSize: 2 }, sorting: [{ desc: false, id: "name" }] } })

    expect(await screen.findByText("Grace")).toBeVisible()
    expect(fetchPage).toHaveBeenCalledWith({ pageIndex: 1, pageSize: 2, sorting: [{ desc: false, id: "name" }] })
    expect(within(screen.getAllByRole("row")[1]!).getByText("Grace")).toBeVisible()
    expect(screen.getByText("Ada")).toBeVisible()
    expect(screen.getByText("Page 2 of 2")).toBeVisible()
    expect(screen.getByText("3 rows")).toBeVisible()
  })

  it("keeps the total and blocks paging while the requested page is loading", async () => {
    const pending = Promise.withResolvers<Page>()
    const initial = Promise.withResolvers<Page>()
    const fetchPage = vi.fn<(state: Request) => Promise<Page>>().mockReturnValueOnce(initial.promise).mockReturnValueOnce(pending.promise)
    const { container } = await renderTable(fetchPage)
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()
    await act(async () => {
      initial.resolve(firstPage)
      await initial.promise
    })
    expect(await screen.findByText("Grace")).toBeVisible()

    await userEvent.click(screen.getByRole("button", { name: "Next page" }))
    expect(fetchPage).toHaveBeenLastCalledWith({ pageIndex: 1, pageSize: 2, sorting: [] })
    expect(screen.getByText("Page 2 of 2")).toBeVisible()
    expect(screen.getByRole("button", { name: "Previous page" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled()
    expect(container.querySelector('[data-slot="skeleton"]')).toBeInTheDocument()

    await act(async () => {
      pending.resolve(lastPage)
      await pending.promise
    })
    expect(await screen.findByText("Alan")).toBeVisible()
    expect(screen.getByRole("button", { name: "Previous page" })).toBeEnabled()
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled()
  })

  it("resets the server page when sorting and refreshes rows on query invalidation", async () => {
    const fetchPage = vi.fn<(state: Request) => Promise<Page>>().mockResolvedValueOnce(lastPage).mockResolvedValueOnce(firstPage)
    const { queryClient } = await renderTable(fetchPage, { initialState: { pagination: { pageIndex: 1, pageSize: 2 } } })
    expect(await screen.findByText("Alan")).toBeVisible()

    await userEvent.click(screen.getByRole("button", { name: /Name/u }))
    expect(await screen.findByText("Grace")).toBeVisible()
    expect(fetchPage).toHaveBeenLastCalledWith({ pageIndex: 0, pageSize: 2, sorting: [{ desc: false, id: "name" }] })
    expect(screen.getByText("Page 1 of 2")).toBeVisible()

    fetchPage.mockResolvedValue({ rows: [], total: 0 })
    await act(() => queryClient.invalidateQueries({ queryKey: ["people"] }))
    expect(await screen.findByText("No results.")).toBeVisible()
    expect(screen.getByText("No rows")).toBeVisible()
  })

  it("surfaces request failures through the route boundary and retries", async () => {
    const fetchPage = vi
      .fn<(state: Request) => Promise<Page>>()
      .mockRejectedValueOnce(new Error("Unavailable"))
      .mockResolvedValue(firstPage)
    await renderTable(fetchPage)
    expect(await screen.findByRole("alert")).toBeVisible()
    await userEvent.click(screen.getByRole("button", { name: errorsGlobalMessages.retry }))
    expect(await screen.findByText("Grace")).toBeVisible()
    await waitFor(() => {
      expect(fetchPage).toHaveBeenCalledTimes(2)
    })
  })
})
