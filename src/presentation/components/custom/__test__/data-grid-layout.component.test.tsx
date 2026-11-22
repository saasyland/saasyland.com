import { createEvent, fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it } from "vite-plus/test"

import {
  closePopover,
  columnTexts,
  gridMessages,
  headerNames,
  renderGrid,
} from "~/src/presentation/components/custom/__test__/fixtures/data-grid"

const { column, toolbar } = gridMessages

const STORED = "saasyland.com:data-grid:v1:"

const COLUMN_DRAG_TYPE = "application/x-data-grid-column"

const header = (name: string): HTMLElement => screen.getByRole("columnheader", { hidden: true, name: new RegExp(`^${name}`, "u") })

const openColumnMenu = async (user: ReturnType<typeof userEvent.setup>, name: string): Promise<HTMLElement> => {
  await user.click(screen.getByRole("button", { name: `${name} column options` }))
  return screen.getByRole("menu")
}

const announced = (): string | null => document.querySelector("[aria-live=polite].sr-only")?.textContent ?? null

const dataTransfer = () => {
  const store = new Map<string, string>()
  return {
    effectAllowed: "all",
    getData: (type: string) => store.get(type) ?? "",
    setData: (type: string, value: string) => {
      store.set(type, value)
    },
    types: [COLUMN_DRAG_TYPE],
  }
}

afterEach(() => {
  localStorage.clear()
})

describe("data grid layout", () => {
  it("shows and hides columns from the columns menu and keeps the choice", async () => {
    const user = userEvent.setup()
    renderGrid({ id: "visible" })

    await user.click(screen.getByRole("button", { name: toolbar.columns }))
    const menu = screen.getByRole("menu", { name: toolbar.columns })
    expect(
      within(menu)
        .getAllByRole("menuitemcheckbox")
        .map((item) => item.textContent),
    ).toStrictEqual(["Name", "Team", "Role", "Age", "Joined", "Actions"])
    expect(within(menu).getByRole("menuitemcheckbox", { name: "Joined" })).toHaveAttribute("aria-checked", "false")

    await user.click(within(menu).getByRole("menuitemcheckbox", { name: "Joined" }))
    await user.click(within(menu).getByRole("menuitemcheckbox", { name: "Team" }))
    await closePopover(user)

    expect(headerNames()).toStrictEqual(["Name", "Role", "Age", "Joined", "Actions"])
    expect(JSON.parse(localStorage.getItem(`${STORED}visible`) ?? "")).toStrictEqual({
      columnVisibility: { actions: true, age: true, joined: true, name: true, role: true, team: false },
    })
  })

  it("opens with the layout saved in this browser and resets it to the defaults", async () => {
    const user = userEvent.setup()
    localStorage.setItem(
      `${STORED}saved`,
      JSON.stringify({ columnOrder: ["age", "name"], columnVisibility: { joined: true, team: false }, density: "compact" }),
    )
    const { container } = renderGrid({ id: "saved" })

    expect(headerNames()).toStrictEqual(["Name", "Age", "Role", "Joined", "Actions"])
    expect(container.querySelector("[data-density]")).toHaveAttribute("data-density", "compact")

    await user.click(screen.getByRole("button", { name: toolbar.reset }))

    expect(headerNames()).toStrictEqual(["Name", "Team", "Role", "Age", "Actions"])
    expect(container.querySelector("[data-density]")).toHaveAttribute("data-density", "comfortable")
    expect(screen.getByRole("button", { name: toolbar.reset })).toBeDisabled()
    expect(localStorage.getItem(`${STORED}saved`)).toBeNull()
    expect(announced()).toBe(toolbar.resetDone)
  })

  it("sorts a column from its menu and says what changed", async () => {
    const user = userEvent.setup()
    renderGrid()

    const menu = await openColumnMenu(user, "Age")
    expect(within(menu).getByRole("menuitem", { name: column.clearSort })).toHaveAttribute("aria-disabled", "true")
    await user.click(within(menu).getByRole("menuitem", { name: column.sortAscending }))
    expect(columnTexts("Age")).toStrictEqual(["36", "41", "45"])
    expect(announced()).toBe("Sorted by Age, ascending.")

    await user.click(within(await openColumnMenu(user, "Age")).getByRole("menuitem", { name: column.sortDescending }))
    expect(columnTexts("Age")).toStrictEqual(["45", "41", "36"])
    await user.click(within(await openColumnMenu(user, "Age")).getByRole("menuitem", { name: column.clearSort }))
    expect(announced()).toBe("No longer sorted by Age.")
  })
})

describe("data grid column menu", () => {
  it("pins a column to the left after the pinned ones and moves it among them", async () => {
    const user = userEvent.setup()
    renderGrid({ selectable: true })

    expect(within(await openColumnMenu(user, "Age")).getByRole("menuitem", { name: column.unpin })).toHaveAttribute("aria-disabled", "true")
    await user.click(screen.getByRole("menuitem", { name: column.pinStart }))
    expect(headerNames()).toStrictEqual(["", "Name", "Age", "Team", "Role", "Actions"])
    expect(header("Age")).toHaveStyle({ insetInlineStart: "220px" })
    expect(announced()).toBe("Age pinned to the left.")

    const menu = await openColumnMenu(user, "Age")
    expect(within(menu).getByRole("menuitem", { name: column.pinStart })).toHaveAttribute("aria-disabled", "true")
    expect(within(menu).queryByRole("menuitem", { name: column.moveEnd })).not.toBeInTheDocument()
    await user.click(within(menu).getByRole("menuitem", { name: column.moveStart }))
    expect(headerNames()).toStrictEqual(["", "Age", "Name", "Team", "Role", "Actions"])
    expect(announced()).toBe("Age moved before Name.")
  })

  it("pins a column to the right and unpins it", async () => {
    const user = userEvent.setup()
    renderGrid()

    await user.click(within(await openColumnMenu(user, "Age")).getByRole("menuitem", { name: column.pinEnd }))
    expect(headerNames()).toStrictEqual(["Name", "Team", "Role", "Actions", "Age"])
    expect(header("Age")).toHaveStyle({ insetInlineEnd: "0px" })
    expect(announced()).toBe("Age pinned to the right.")

    await user.click(within(await openColumnMenu(user, "Age")).getByRole("menuitem", { name: column.unpin }))
    expect(headerNames()).toStrictEqual(["Name", "Team", "Role", "Age", "Actions"])
    expect(announced()).toBe("Age unpinned.")
  })

  it("moves and hides a column that is not pinned", async () => {
    const user = userEvent.setup()
    renderGrid()

    await user.click(within(await openColumnMenu(user, "Team")).getByRole("menuitem", { name: column.moveEnd }))
    expect(headerNames()).toStrictEqual(["Name", "Role", "Team", "Age", "Actions"])
    expect(announced()).toBe("Team moved after Role.")

    await user.click(within(await openColumnMenu(user, "Team")).getByRole("menuitem", { name: column.hide }))
    expect(headerNames()).toStrictEqual(["Name", "Role", "Age", "Actions"])
    expect(announced()).toBe("Team hidden. Show it again from the Columns menu.")
  })

  it("offers no sorting in the menu of a column that cannot sort, and no hiding where it is not allowed", async () => {
    const user = userEvent.setup()
    renderGrid()

    const menu = await openColumnMenu(user, "Actions")

    expect(within(menu).queryByRole("menuitem", { name: column.sortAscending })).not.toBeInTheDocument()
    expect(within(menu).queryByRole("menuitem", { name: column.moveStart })).not.toBeInTheDocument()
    expect(within(menu).getByRole("menuitem", { name: column.hide })).toBeVisible()
  })
})

describe("data grid column dragging and resizing", () => {
  it("moves a column by dragging its header onto another one in the same region", () => {
    renderGrid()
    const transfer = dataTransfer()

    fireEvent.dragStart(header("Age"), { dataTransfer: transfer })
    expect(header("Age")).toHaveClass("opacity-50")

    const ignored = createEvent.dragOver(header("Name"), { dataTransfer: transfer })
    fireEvent(header("Name"), ignored)
    expect(ignored.defaultPrevented).toBe(false)

    const accepted = createEvent.dragOver(header("Team"), { dataTransfer: transfer })
    fireEvent(header("Team"), accepted)
    expect(accepted.defaultPrevented).toBe(true)
    expect(header("Team")).toHaveClass("bg-muted")
    fireEvent.dragLeave(header("Team"))
    expect(header("Team")).not.toHaveClass("bg-muted")

    fireEvent.dragOver(header("Team"), { dataTransfer: transfer })
    fireEvent.drop(header("Team"), { dataTransfer: transfer })
    fireEvent.dragEnd(header("Age"))

    expect(headerNames()).toStrictEqual(["Name", "Age", "Team", "Role", "Actions"])
    expect(announced()).toBe("Age moved before Team.")
  })

  it("ignores a drop that no column drag started", () => {
    renderGrid()

    fireEvent.drop(header("Team"), { dataTransfer: dataTransfer() })

    expect(headerNames()).toStrictEqual(["Name", "Team", "Role", "Age", "Actions"])
  })

  it("resizes a column with the arrow keys and keeps the width", async () => {
    const user = userEvent.setup()
    renderGrid({ id: "sized" })
    const resizer = screen.getByRole("separator", { name: "Resize the Team column" })

    expect(resizer).toHaveAttribute("aria-valuenow", "176")
    resizer.focus()
    await user.keyboard("{ArrowRight}{ArrowRight}{ArrowLeft}{Enter}")

    expect(resizer).toHaveAttribute("aria-valuenow", "192")
    expect(JSON.parse(localStorage.getItem(`${STORED}sized`) ?? "")).toStrictEqual({ columnSizing: { team: 192 } })
  })

  it("resizes a column by dragging its edge and resets it with a double click", async () => {
    const user = userEvent.setup()
    renderGrid()
    const resizer = screen.getByRole("separator", { name: "Resize the Team column" })

    fireEvent.mouseDown(resizer, { clientX: 100 })
    fireEvent.mouseMove(document, { clientX: 140 })
    fireEvent.mouseUp(document, { clientX: 140 })
    expect(resizer).toHaveAttribute("aria-valuenow", "216")

    fireEvent.touchStart(resizer, { touches: [{ clientX: 100 }] })
    fireEvent.touchEnd(document, { touches: [] })
    await user.dblClick(resizer)
    expect(resizer).toHaveAttribute("aria-valuenow", "176")
  })
})
