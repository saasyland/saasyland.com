import { fireEvent, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { controlTimers, passTime } from "~/src/platform/testing/lib/clock"
import { fill } from "~/src/platform/testing/lib/fill"

import { DATA_GRID_TYPING_DELAY_MS } from "~/src/integrations/tanstack-table/table.features"

import { DATA_GRID_ACTIONS_SIZE } from "~/src/data/data-grid"

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
import type { DataGridProps } from "~/src/presentation/components/custom/data-grid"

const { empty, pagination, rows: rowMessages, selection, toolbar } = gridMessages

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
    expect(headerNames()).toStrictEqual(["Name", "Team", "Role", "Age", "Profile"])
    expect(screen.getByRole("columnheader", { name: /^Name/u })).toHaveClass("sticky")
    expect(screen.getByRole("columnheader", { name: /^Profile/u })).toHaveClass("sticky")
    expect(within(screen.getByRole("columnheader", { name: /^Name/u })).getByText("Name")).toHaveClass("truncate")
    expect(within(screen.getByRole("columnheader", { name: /^Profile/u })).getByText("Profile")).toHaveClass("truncate")
    expect(screen.getByRole("columnheader", { name: /^Name/u })).toHaveClass("whitespace-nowrap")
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
    const user = controlTimers()
    renderGrid(SEARCH)

    await fill(user, screen.getByRole("searchbox", { name: "Search people" }), "gra")
    await passTime(DATA_GRID_TYPING_DELAY_MS)
    expect(columnTexts("Name")).toStrictEqual(["Grace"])

    await user.click(screen.getByRole("button", { name: "Clear search" }))
    await passTime(DATA_GRID_TYPING_DELAY_MS)
    expect(columnTexts("Name")).toStrictEqual(["Ada", "Grace", "Alan"])
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
    const user = controlTimers()
    renderGrid(SEARCH)

    await fill(user, screen.getByRole("searchbox", { name: "Search people" }), "nobody")
    await passTime(DATA_GRID_TYPING_DELAY_MS)
    expect(screen.getByText(empty.filteredTitle)).toBeVisible()

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
      "﻿Name,Team,Role,Age,Profile\r\nAda,COMPILERS,Engineer,36,\r\nGrace,COMPILERS,Lead,45,\r\nAlan,KERNELS,Researcher,41,\r\n",
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
      expect(downloaded()).toBe("\uFEFFName,Team,Role,Age,Profile\r\nAda,COMPILERS,Engineer,36,\r\n")
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

const PersonActions = ({ row }: { readonly row: Person }) => <button type="button">{`Open ${row.name}`}</button>

describe("data grid row actions", () => {
  it("ends every row with its actions, pinned to the right, out of the menus and the CSV", async () => {
    const user = userEvent.setup()
    renderGrid({ rowActions: PersonActions, selectable: true })

    expect(headerNames()).toStrictEqual(["", "Name", "Team", "Role", "Age", "Profile", gridMessages.actions.header])
    expect(screen.getByRole("columnheader", { name: gridMessages.actions.header })).toHaveClass("sticky")
    expect(within(bodyRows()[1] ?? document.body).getByRole("button", { name: "Open Grace" })).toBeVisible()
    expect(screen.queryByRole("button", { name: `${gridMessages.actions.header} column options` })).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: toolbar.columns }))
    expect(screen.queryByRole("menuitemcheckbox", { name: gridMessages.actions.header })).not.toBeInTheDocument()
    await user.keyboard("{Escape}")

    await user.click(screen.getByRole("button", { name: toolbar.export }))
    await waitFor(() => {
      expect(downloaded()).toBe(
        "﻿Name,Team,Role,Age,Profile\r\nAda,COMPILERS,Engineer,36,\r\nGrace,COMPILERS,Lead,45,\r\nAlan,KERNELS,Researcher,41,\r\n",
      )
    })
  })

  it("keeps the actions column at the width of one menu button and lets the last data column take the rest", () => {
    const { container } = renderGrid({ rowActions: PersonActions })

    const widths = [...container.querySelectorAll("col")].map((col) => col.style.width)
    expect(widths.at(-1)).toBe(`${String(DATA_GRID_ACTIONS_SIZE)}px`)
    expect(widths.at(-2)).toBe("")
  })
})

type Reorder = NonNullable<DataGridProps<Person>["onReorder"]>

const handles = (): HTMLElement[] => screen.getAllByRole("button", { name: rowMessages.handle })

const handleOf = (index: number): HTMLElement => handles()[index] ?? document.body

const dragSourceOf = (index: number): HTMLElement => handleOf(index).parentElement ?? document.body

const transfer = (dropEffect: string) => ({ dataTransfer: { dropEffect, effectAllowed: "none", setData: vi.fn() } })

const announced = (): string =>
  screen.getByText((_, element) => element?.getAttribute("aria-live") === "polite" && element.classList.contains("sr-only")).textContent

describe("data grid row order", () => {
  it("drags a row by its handle onto another place, shows the new order at once and saves it", () => {
    const onReorder = vi.fn<Reorder>().mockResolvedValue(undefined)
    renderGrid({ onReorder, selectable: true })

    expect(headerNames()).toStrictEqual(["", rowMessages.header, "Name", "Team", "Role", "Age", "Profile"])
    expect(screen.getByRole("columnheader", { name: rowMessages.header })).toHaveClass("sticky")
    expect(dragSourceOf(0)).toHaveAttribute("draggable", "true")

    fireEvent.dragStart(dragSourceOf(0), transfer("move"))
    expect(fireEvent.dragEnter(bodyRows()[2] ?? document.body, transfer("none"))).toBe(false)
    expect(columnTexts("Name")).toStrictEqual(["Grace", "Alan", "Ada"])
    expect(bodyRows()[2]).toHaveClass("opacity-40")
    expect(fireEvent.dragOver(bodyRows()[2] ?? document.body, transfer("none"))).toBe(false)
    expect(fireEvent.drop(bodyRows()[2] ?? document.body)).toBe(false)
    fireEvent.dragEnd(dragSourceOf(2), transfer("move"))

    expect(onReorder).toHaveBeenCalledWith({ offset: 2, row: PEOPLE[0] })
    expect(bodyRows()[2]).not.toHaveClass("opacity-40")
    expect(announced()).toBe("Moved to position 3 of 3.")
  })

  it("puts a row back when the drag is cancelled and saves nothing for a row dropped where it was", () => {
    const onReorder = vi.fn<Reorder>().mockResolvedValue(undefined)
    renderGrid({ onReorder })

    fireEvent.dragStart(dragSourceOf(0), transfer("move"))
    fireEvent.dragEnter(bodyRows()[1] ?? document.body, transfer("none"))
    expect(columnTexts("Name")).toStrictEqual(["Grace", "Ada", "Alan"])
    fireEvent.dragEnd(dragSourceOf(1), transfer("none"))
    expect(columnTexts("Name")).toStrictEqual(["Ada", "Grace", "Alan"])

    fireEvent.dragStart(dragSourceOf(1), transfer("move"))
    fireEvent.dragEnter(bodyRows()[1] ?? document.body, transfer("none"))
    fireEvent.dragEnd(dragSourceOf(1), transfer("move"))

    expect(onReorder).not.toHaveBeenCalled()
  })

  it("leaves the rows alone under a drag that did not start on a handle", () => {
    renderGrid({ onReorder: vi.fn<Reorder>() })

    expect(fireEvent.dragEnter(bodyRows()[2] ?? document.body)).toBe(true)
    expect(fireEvent.dragOver(bodyRows()[2] ?? document.body, transfer("none"))).toBe(true)
    expect(columnTexts("Name")).toStrictEqual(["Ada", "Grace", "Alan"])
  })

  it("moves a row one place with the arrow keys on its handle and keeps the focus there", async () => {
    const onReorder = vi.fn<Reorder>().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderGrid({ onReorder })

    handleOf(0).focus()
    await user.keyboard("{ArrowUp}")
    await user.keyboard("a")
    expect(onReorder).not.toHaveBeenCalled()

    await user.keyboard("{ArrowDown}")
    expect(columnTexts("Name")).toStrictEqual(["Grace", "Ada", "Alan"])
    expect(onReorder).toHaveBeenLastCalledWith({ offset: 1, row: PEOPLE[0] })
    await waitFor(() => {
      expect(handleOf(1)).toHaveFocus()
    })

    await user.keyboard("{ArrowDown}")
    await user.keyboard("{ArrowDown}")
    expect(columnTexts("Name")).toStrictEqual(["Grace", "Alan", "Ada"])
    expect(onReorder).toHaveBeenCalledTimes(2)
  })

  it("puts the rows back when the move cannot be saved", async () => {
    const user = userEvent.setup()
    renderGrid({ onReorder: vi.fn<Reorder>().mockRejectedValue(new Error("offline")) })

    handleOf(0).focus()
    await user.keyboard("{ArrowDown}")

    await waitFor(() => {
      expect(columnTexts("Name")).toStrictEqual(["Ada", "Grace", "Alan"])
    })
  })

  it("follows a row moved past the top of its page to the page before", async () => {
    const onReorder = vi.fn<Reorder>().mockResolvedValue(undefined)
    const user = userEvent.setup()
    renderGrid({ data: MANY_PEOPLE, onReorder })

    await user.click(screen.getByRole("button", { name: pagination.next }))
    expect(columnTexts("Name")[0]).toBe("Person 10")
    handleOf(0).focus()
    await user.keyboard("{ArrowUp}")

    expect(onReorder).toHaveBeenCalledWith({ offset: -1, row: MANY_PEOPLE[10] })
    expect(screen.getByText(pagination.page.replace("{current}", "1").replace("{total}", "3"))).toBeVisible()
    expect(columnTexts("Name").at(-1)).toBe("Person 10")
    await waitFor(() => {
      expect(handles().at(-1)).toHaveFocus()
    })
  })

  it("turns the handles off while the rows are sorted, filtered or searched", async () => {
    const user = userEvent.setup()
    renderGrid({ ...SEARCH, onReorder: vi.fn<Reorder>() })

    await user.click(screen.getByRole("button", { name: "Name" }))

    expect(handleOf(0)).toBeDisabled()
    expect(dragSourceOf(0)).toHaveAttribute("draggable", "false")
  })
})
