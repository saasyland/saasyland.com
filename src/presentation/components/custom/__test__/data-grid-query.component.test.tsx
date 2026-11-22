import { queryOptions } from "@tanstack/react-query"
import { act, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { MAX_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"

import * as download from "~/src/lib/download"

import {
  PEOPLE,
  type Person,
  SEARCH,
  bodyRows,
  closePopover,
  columnTexts,
  gridMessages,
  renderGrid,
} from "~/src/presentation/components/custom/__test__/fixtures/data-grid"
import type { DataGridPage, DataGridRequest } from "~/src/presentation/components/custom/data-grid"

const { filters, pagination, toolbar } = gridMessages

type FetchPage = (request: DataGridRequest) => Promise<DataGridPage<Person>>

const FIRST_REQUEST: DataGridRequest = { filters: {}, pageIndex: 0, pageSize: 10, search: "", sorting: [] }

const renderServerGrid = (fetchPage: FetchPage) =>
  renderGrid({
    ...SEARCH,
    data: [],
    query: (request) => queryOptions<DataGridPage<Person>>({ queryFn: () => fetchPage(request), queryKey: ["people", request] }),
  })

const servedPage = (rows: Person[], total: number): FetchPage => vi.fn<FetchPage>().mockResolvedValue({ rows, total })

beforeEach(() => {
  vi.spyOn(download, "downloadFile").mockImplementation(() => {})
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("data grid on the server", () => {
  it("asks the server for one page and shows its total", async () => {
    const fetchPage = servedPage(PEOPLE.slice(0, 2), 12)
    renderServerGrid(fetchPage)

    expect(await screen.findByText("Ada")).toBeVisible()
    expect(fetchPage).toHaveBeenCalledWith(FIRST_REQUEST)
    expect(screen.getByText("1–10 of 12")).toBeVisible()
    expect(screen.getByRole("table", { name: "People" })).toHaveAttribute("aria-rowcount", "13")
  })

  it("asks for the next page and for the first page again when the sorting changes", async () => {
    const user = userEvent.setup()
    const fetchPage = servedPage(PEOPLE, 30)
    renderServerGrid(fetchPage)
    await screen.findByText("Ada")

    await user.click(screen.getByRole("button", { name: pagination.next }))
    await waitFor(() => {
      expect(fetchPage).toHaveBeenLastCalledWith({ ...FIRST_REQUEST, pageIndex: 1 })
    })

    await user.click(screen.getByRole("button", { name: "Name" }))
    await waitFor(() => {
      expect(fetchPage).toHaveBeenLastCalledWith({ ...FIRST_REQUEST, sorting: [{ desc: false, id: "name" }] })
    })
  })

  it("sends the trimmed search once the visitor stops typing", async () => {
    const user = userEvent.setup()
    const fetchPage = servedPage(PEOPLE, 3)
    renderServerGrid(fetchPage)
    await screen.findByText("Ada")

    await user.click(screen.getByRole("searchbox", { name: SEARCH.search }))
    await user.paste("  ada ")

    await waitFor(() => {
      expect(fetchPage).toHaveBeenLastCalledWith({ ...FIRST_REQUEST, search: "ada" })
    })
  })

  it("sends the filters by column and keeps the server's rows as they come", async () => {
    const user = userEvent.setup()
    const fetchPage = servedPage(PEOPLE, 3)
    renderServerGrid(fetchPage)
    await screen.findByText("Ada")

    await user.click(screen.getByRole("button", { name: filters.filter }))
    await user.click(screen.getByRole("option", { name: "Team" }))
    await user.click(screen.getByRole("option", { name: "Kernels" }))
    await closePopover(user)

    await waitFor(() => {
      expect(fetchPage).toHaveBeenLastCalledWith({ ...FIRST_REQUEST, filters: { team: "kernels" } })
    })
    expect(columnTexts("Name")).toStrictEqual(["Ada", "Grace", "Alan"])
  })

  it("shows skeleton rows until the first page arrives, then keeps the old page dimmed while the next one loads", async () => {
    const user = userEvent.setup()
    const first = Promise.withResolvers<DataGridPage<Person>>()
    const second = Promise.withResolvers<DataGridPage<Person>>()
    const fetchPage = vi.fn<FetchPage>().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const { container } = renderServerGrid(fetchPage)

    expect(screen.getByRole("table", { name: "People" })).toHaveAttribute("aria-busy", "true")
    expect(container.querySelectorAll("tbody [data-slot=skeleton]").length).toBeGreaterThan(0)
    await act(async () => {
      first.resolve({ rows: PEOPLE, total: 12 })
      await first.promise
    })

    await user.click(screen.getByRole("button", { name: pagination.next }))
    expect(screen.getByRole("table", { name: "People" })).toHaveAttribute("aria-busy", "true")
    expect(screen.getByRole("button", { name: pagination.previous })).toBeDisabled()
    expect(columnTexts("Name")).toStrictEqual(["Ada", "Grace", "Alan"])

    second.resolve({ rows: PEOPLE.slice(2), total: 12 })
    await waitFor(() => {
      expect(bodyRows()).toHaveLength(1)
    })
    expect(screen.getByRole("table", { name: "People" })).toHaveAttribute("aria-busy", "false")
  })

  it("exports every page the filters match, not only the one on screen", async () => {
    const user = userEvent.setup()
    const everyone: Person[] = Array.from({ length: MAX_PAGE_SIZE + 2 }, (_, index) => ({
      age: 30,
      id: `p${String(index)}`,
      joined: new Date("2026-11-01T00:00:00.000Z"),
      name: "Ada",
      role: "Engineer",
      team: "kernels",
    }))
    const fetchPage = vi.fn<FetchPage>(({ pageIndex, pageSize }) =>
      Promise.resolve({ rows: everyone.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize), total: everyone.length }),
    )
    renderServerGrid(fetchPage)
    await screen.findAllByText("Ada")

    await user.click(screen.getByRole("button", { name: toolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    expect(fetchPage).toHaveBeenCalledWith({ ...FIRST_REQUEST, pageSize: MAX_PAGE_SIZE })
    expect(fetchPage).toHaveBeenCalledWith({ ...FIRST_REQUEST, pageIndex: 1, pageSize: MAX_PAGE_SIZE })
    expect(vi.mocked(download.downloadFile).mock.calls[0]?.[0].content.trim().split("\r\n")).toHaveLength(everyone.length + 1)
  })

  it("stops exporting when the server runs out of rows before its total", async () => {
    const user = userEvent.setup()
    const fetchPage = vi.fn<FetchPage>(({ pageIndex }) => Promise.resolve({ rows: pageIndex === 0 ? PEOPLE : [], total: 500 }))
    renderServerGrid(fetchPage)
    await screen.findByText("Ada")

    await user.click(screen.getByRole("button", { name: toolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    expect(within(document.body).queryByRole("alert")).not.toBeInTheDocument()
    expect(vi.mocked(download.downloadFile).mock.calls[0]?.[0].content.trim().split("\r\n")).toHaveLength(PEOPLE.length + 1)
  })
})
