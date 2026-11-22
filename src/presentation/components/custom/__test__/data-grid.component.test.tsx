import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import * as download from "~/src/lib/download"

import {
  PEOPLE,
  type Person,
  SEARCH,
  bodyRows,
  columnTexts,
  gridMessages,
  headerNames,
  renderGrid,
} from "~/src/presentation/components/custom/__test__/fixtures/data-grid"

const { empty, pagination, selection, toolbar } = gridMessages

const MANY_PEOPLE: Person[] = Array.from({ length: 23 }, (_, index) => ({
  age: 20 + index,
  id: `person-${String(index)}`,
  joined: new Date(Date.UTC(2026, 0, index + 1)),
  name: `Person ${String(index).padStart(2, "0")}`,
  role: "Engineer",
  team: "kernels",
}))

const downloaded = (): string => {
  const [call] = vi.mocked(download.downloadFile).mock.calls.at(-1) ?? []
  return call?.content ?? ""
}

beforeEach(() => {
  vi.spyOn(download, "downloadFile").mockImplementation(() => {})
})

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("data grid", () => {
  it("names the table and its columns, hides the columns their meta hides and pins the first one", () => {
    renderGrid()

    expect(screen.getByRole("table", { name: "People" })).toHaveAttribute("aria-rowcount", String(PEOPLE.length + 1))
    expect(headerNames()).toStrictEqual(["Name", "Team", "Role", "Age", "Actions"])
    expect(screen.getByRole("columnheader", { name: /^Name/u })).toHaveClass("sticky")
    expect(screen.getByRole("columnheader", { name: /^Actions/u })).toHaveClass("sticky")
    expect(columnTexts("Name")).toStrictEqual(["Ada", "Grace", "Alan"])
    expect(bodyRows().map((row) => row.getAttribute("aria-rowindex"))).toStrictEqual(["2", "3", "4"])
  })

  it("sorts by a column both ways and reports the order to screen readers", async () => {
    const user = userEvent.setup()
    renderGrid()

    await user.click(screen.getByRole("button", { name: "Name" }))
    expect(columnTexts("Name")).toStrictEqual(["Ada", "Alan", "Grace"])
    expect(screen.getByRole("columnheader", { name: /^Name/u })).toHaveAttribute("aria-sort", "ascending")

    await user.click(screen.getByRole("button", { name: "Name" }))
    expect(columnTexts("Name")).toStrictEqual(["Grace", "Alan", "Ada"])
    expect(screen.getByRole("columnheader", { name: /^Name/u })).toHaveAttribute("aria-sort", "descending")
  })

  it("adds a second sort with shift and numbers the sorted columns", async () => {
    const user = userEvent.setup()
    renderGrid()

    await user.click(screen.getByRole("button", { name: "Team" }))
    await user.keyboard("{Shift>}")
    await user.click(screen.getByRole("button", { name: "Age" }))
    await user.keyboard("{/Shift}")
    expect(columnTexts("Name")).toStrictEqual(["Grace", "Ada", "Alan"])
    expect(screen.getByRole("button", { name: "Team" })).toHaveTextContent("Team1")
    expect(screen.getByRole("button", { name: "Age" })).toHaveTextContent("Age2")
    expect(screen.getByRole("columnheader", { name: /^Role/u })).not.toHaveAttribute("aria-sort")
  })

  it("searches every column after the visitor stops typing and clears the search", async () => {
    const user = userEvent.setup()
    renderGrid(SEARCH)

    await user.click(screen.getByRole("searchbox", { name: "Search people" }))
    await user.paste("gra")
    await waitFor(() => {
      expect(columnTexts("Name")).toStrictEqual(["Grace"])
    })

    await user.click(screen.getByRole("button", { name: "Clear search" }))
    await waitFor(() => {
      expect(columnTexts("Name")).toStrictEqual(["Ada", "Grace", "Alan"])
    })
  })

  it("leaves the search out when the page names none", () => {
    renderGrid()

    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument()
  })

  it("says nothing is there yet, in the page's words or its own", () => {
    const { unmount } = renderGrid({ data: [], empty: "No people yet." })

    expect(screen.getByRole("status")).toHaveTextContent("No people yet.")
    unmount()

    renderGrid({ data: [] })
    expect(screen.getByRole("status")).toHaveTextContent(empty.title)
  })

  it("says when nothing matches and clears the search and filters from there", async () => {
    const user = userEvent.setup()
    renderGrid(SEARCH)

    await user.click(screen.getByRole("searchbox", { name: "Search people" }))
    await user.paste("nobody")
    expect(await screen.findByText(empty.filteredTitle)).toBeVisible()

    await user.click(screen.getByRole("button", { name: empty.clear }))
    expect(screen.getByRole("searchbox", { name: "Search people" })).toHaveValue("")
    expect(columnTexts("Name")).toHaveLength(PEOPLE.length)
  })
})

describe("data grid paging, density and export", () => {
  it("pages through the rows", async () => {
    const user = userEvent.setup()
    renderGrid({ data: MANY_PEOPLE })

    expect(screen.getByText("1–10 of 23")).toBeVisible()
    expect(screen.getByText("Page 1 of 3")).toBeVisible()
    expect(screen.getByRole("button", { name: pagination.first })).toBeDisabled()

    await user.click(screen.getByRole("button", { name: pagination.next }))
    expect(screen.getByText("11–20 of 23")).toBeVisible()
    await user.click(screen.getByRole("button", { name: pagination.last }))
    expect(screen.getByText("21–23 of 23")).toBeVisible()
    expect(screen.getByRole("button", { name: pagination.next })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: pagination.previous }))
    expect(screen.getByText("Page 2 of 3")).toBeVisible()
    await user.click(screen.getByRole("button", { name: pagination.first }))
    expect(screen.getByText("Page 1 of 3")).toBeVisible()
  })

  it("changes the page size and remembers it", async () => {
    const user = userEvent.setup()
    renderGrid({ data: MANY_PEOPLE, id: "paged" })

    await user.click(screen.getByRole("button", { name: new RegExp(pagination.rowsPerPage, "u") }))
    await user.click(screen.getByRole("option", { name: "25" }))
    expect(screen.getByText("1–23 of 23")).toBeVisible()
    expect(bodyRows()).toHaveLength(MANY_PEOPLE.length)
    expect(JSON.parse(localStorage.getItem("saasyland.com:data-grid:v1:paged") ?? "")).toStrictEqual({ pageSize: 25 })
  })

  it("switches the row density and keeps it", async () => {
    const user = userEvent.setup()
    const { container } = renderGrid()

    await user.click(screen.getByRole("radio", { name: toolbar.compact }))
    expect(container.querySelector("[data-density]")).toHaveAttribute("data-density", "compact")
    await user.click(screen.getByRole("radio", { name: toolbar.compact }))
    expect(container.querySelector("[data-density]")).toHaveAttribute("data-density", "compact")
    await user.click(screen.getByRole("radio", { name: toolbar.comfortable }))
    expect(container.querySelector("[data-density]")).toHaveAttribute("data-density", "comfortable")
  })

  it("exports the filtered rows of every page with the visible columns to CSV", async () => {
    const user = userEvent.setup()
    vi.useFakeTimers({ now: new Date("2026-11-22T12:00:00.000Z"), toFake: ["Date"] })
    renderGrid({ id: "people" })

    await user.click(screen.getByRole("button", { name: toolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledWith(
        expect.objectContaining({ fileName: "people-2026-11-22.csv", type: "text/csv;charset=utf-8" }),
      )
    })
    expect(downloaded()).toBe(
      "﻿Name,Team,Role,Age,Actions\r\nAda,COMPILERS,Engineer,36,\r\nGrace,COMPILERS,Lead,45,\r\nAlan,KERNELS,Researcher,41,\r\n",
    )
    vi.useRealTimers()
  })

  it("writes dates as ISO moments and leaves other values without an export blank", async () => {
    const user = userEvent.setup()
    renderGrid()

    await user.click(screen.getByRole("button", { name: toolbar.columns }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: "Joined" }))
    await user.keyboard("{Escape}")
    await user.click(screen.getByRole("button", { name: toolbar.export }))

    await waitFor(() => {
      expect(downloaded()).toContain("Ada,COMPILERS,Engineer,36,2026-11-20T10:00:00.000Z,")
    })
  })

  it("tells the visitor when the export fails", async () => {
    const user = userEvent.setup()
    vi.mocked(download.downloadFile).mockImplementation(() => {
      throw new Error("blocked")
    })
    const failed = vi.spyOn(toast, "error").mockReturnValue("toast")
    renderGrid()

    await user.click(screen.getByRole("button", { name: toolbar.export }))

    await waitFor(() => {
      expect(failed).toHaveBeenCalledOnce()
    })
  })
})

describe("data grid selection", () => {
  it("selects a row, then exports and acts on the selection", async () => {
    const user = userEvent.setup()
    const bulkActions = vi.fn((rows: readonly Person[]) => <span>{`${String(rows.length)} chosen`}</span>)
    renderGrid({ bulkActions, selectable: true })

    expect(headerNames()[0]).toBe("")
    await user.click(within(bodyRows()[0] ?? document.body).getByRole("checkbox", { name: selection.selectRow }))
    const bar = screen.getByRole("region", { name: selection.region })
    expect(bar).toHaveTextContent("1 row selected")
    expect(within(bar).getByText("1 chosen")).toBeVisible()

    await user.click(within(bar).getByRole("button", { name: selection.export }))
    await waitFor(() => {
      expect(downloaded()).toBe("\uFEFFName,Team,Role,Age,Actions\r\nAda,COMPILERS,Engineer,36,\r\n")
    })

    await user.click(within(bar).getByRole("button", { name: selection.clear }))
    expect(screen.queryByRole("region", { name: selection.region })).not.toBeInTheDocument()
  })

  it("selects the whole page and forgets the selection when the page changes", async () => {
    const user = userEvent.setup()
    renderGrid({ data: MANY_PEOPLE, selectable: true })

    await user.click(screen.getByRole("checkbox", { name: selection.selectPage }))
    expect(screen.getByRole("region", { name: selection.region })).toHaveTextContent("10 rows selected")
    await user.click(screen.getByRole("checkbox", { name: selection.selectPage }))
    expect(screen.queryByRole("region", { name: selection.region })).not.toBeInTheDocument()

    await user.click(within(bodyRows()[1] ?? document.body).getByRole("checkbox", { name: selection.selectRow }))
    await user.click(screen.getByRole("button", { name: pagination.next }))
    expect(screen.queryByRole("region", { name: selection.region })).not.toBeInTheDocument()
  })

  it("selects without a bulk action slot", async () => {
    const user = userEvent.setup()
    renderGrid({ selectable: true })

    await user.click(within(bodyRows()[0] ?? document.body).getByRole("checkbox", { name: selection.selectRow }))

    expect(within(screen.getByRole("region", { name: selection.region })).getAllByRole("button")).toHaveLength(2)
  })
})
