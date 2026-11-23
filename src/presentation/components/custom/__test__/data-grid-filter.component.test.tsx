import { createColumnHelper } from "@tanstack/react-table"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { DATA_GRID_FILTER, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

import {
  type Person,
  TEAMS,
  closePopover,
  columnTexts,
  gridMessages,
  renderGrid,
} from "~/src/presentation/components/custom/__test__/fixtures/data-grid"

const { filters } = gridMessages

const NOW = new Date("2026-11-22T12:00:00.000Z")

const helper = createColumnHelper<DataGridFeatures, Person>()

const TEAM_CHOICES = helper.columns([
  helper.accessor("name", { header: "Name" }),
  helper.accessor("team", { header: "Team", meta: { filter: { kind: DATA_GRID_FILTER.MULTI_SELECT, options: TEAMS } } }),
])

const openFilter = async (user: ReturnType<typeof userEvent.setup>, column: string): Promise<HTMLElement> => {
  await user.click(screen.getByRole("button", { name: new RegExp(`^${filters.filter}`, "u") }))
  await user.click(screen.getByRole("option", { name: new RegExp(`^${column}`, "u") }))
  return screen.getByRole("dialog")
}

const chip = (column: string): HTMLElement => screen.getByRole("group", { hidden: true, name: column })

afterEach(() => {
  vi.useRealTimers()
  localStorage.clear()
})

describe("data grid filters", () => {
  it("lists every column with a filter, the hidden ones too", async () => {
    const user = userEvent.setup()
    renderGrid()

    await user.click(screen.getByRole("button", { name: filters.filter }))

    expect(within(screen.getByRole("dialog")).getByRole("heading", { name: filters.choose })).toBeVisible()
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual(["Name", "Team", "Role", "Age", "Joined"])
  })

  it("filters a text column after the visitor stops typing and counts the filter on the button", async () => {
    const user = userEvent.setup()
    renderGrid()

    const dialog = await openFilter(user, "Name")
    expect(within(dialog).getByRole("heading", { name: "Filter by Name" })).toBeVisible()
    expect(within(dialog).getByRole("button", { name: filters.clear })).toBeDisabled()
    await user.paste(" ad ")

    await waitFor(() => {
      expect(columnTexts("Name")).toStrictEqual(["Ada"])
    })
    expect(screen.getByRole("button", { hidden: true, name: /^Filter1/u })).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: filters.back }))
    expect(screen.getByRole("option", { name: "Name: contains “ad”" })).toBeVisible()
  })

  it("reopens a filter from its chip", async () => {
    const user = userEvent.setup()
    renderGrid()

    await openFilter(user, "Name")
    await user.paste("ad")
    await waitFor(() => {
      expect(columnTexts("Name")).toStrictEqual(["Ada"])
    })
    await closePopover(user)

    await user.click(within(chip("Name")).getByRole("button", { name: "Name: contains “ad”" }))
    const field = within(screen.getByRole("dialog")).getByRole("textbox", { name: "Name" })
    expect(field).toHaveValue("ad")
    await user.clear(field)
    await waitFor(() => {
      expect(columnTexts("Name")).toHaveLength(3)
    })
  })

  it("keeps one option of a single choice and lets the visitor take it back", async () => {
    const user = userEvent.setup()
    renderGrid()

    const dialog = await openFilter(user, "Team")
    await user.click(within(dialog).getByRole("option", { name: "Kernels" }))
    expect(columnTexts("Name")).toStrictEqual(["Alan"])
    expect(within(chip("Team")).getByRole("button", { hidden: true, name: "Team: Kernels" })).toBeInTheDocument()

    await user.click(within(dialog).getByRole("option", { name: "Kernels" }))
    expect(columnTexts("Name")).toHaveLength(3)
    expect(screen.queryByRole("group", { hidden: true, name: "Team" })).not.toBeInTheDocument()
  })

  it("highlights the option under the pointer and shows each choice as a chip in the toolbar while the list stays open", async () => {
    const user = userEvent.setup()
    renderGrid({ columns: TEAM_CHOICES })

    const dialog = await openFilter(user, "Team")
    const kernels = within(dialog).getByRole("option", { name: "Kernels" })
    await user.hover(kernels)
    expect(kernels).toHaveAttribute("data-hovered", "true")
    expect(kernels).toHaveClass("data-hovered:bg-accent")

    await user.click(within(dialog).getByRole("option", { name: "Compilers" }))
    expect(within(chip("Team")).getByRole("button", { hidden: true, name: "Team: Compilers" })).toBeInTheDocument()
    expect(columnTexts("Name")).toStrictEqual(["Ada", "Grace"])
    await user.click(kernels)
    expect(within(chip("Team")).getByRole("button", { hidden: true, name: "Team: Compilers or Kernels" })).toBeInTheDocument()
    expect(columnTexts("Name")).toHaveLength(3)
    expect(screen.getByRole("dialog")).toBeVisible()
    expect(chip("Team").closest("[data-slot=data-grid-toolbar]")).not.toBeNull()
  })

  it("searches a long list of options", async () => {
    const user = userEvent.setup()
    renderGrid()

    const dialog = await openFilter(user, "Role")
    await user.paste("zzz")
    expect(within(dialog).getByText(filters.options.none)).toBeVisible()
    await user.clear(within(dialog).getByRole("searchbox", { name: filters.options.search }))
    await user.paste("res")

    expect(
      within(dialog)
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toStrictEqual(["Researcher"])
  })

  it("keeps any of several options and summarises them", async () => {
    const user = userEvent.setup()
    renderGrid()

    const dialog = await openFilter(user, "Role")
    await user.click(within(dialog).getByRole("option", { name: "Researcher" }))
    await user.click(within(dialog).getByRole("option", { name: "Engineer" }))
    expect(columnTexts("Name")).toStrictEqual(["Ada", "Alan"])
    expect(within(chip("Role")).getByRole("button", { hidden: true, name: "Role: Engineer or Researcher" })).toBeInTheDocument()

    await user.click(within(dialog).getByRole("option", { name: "Lead" }))
    expect(within(chip("Role")).getByRole("button", { hidden: true, name: "Role: 3 selected" })).toBeInTheDocument()
  })

  it("drops the filter when the last option is taken back", async () => {
    const user = userEvent.setup()
    renderGrid()

    const dialog = await openFilter(user, "Role")
    await user.click(within(dialog).getByRole("option", { name: "Lead" }))
    await user.click(within(dialog).getByRole("option", { name: "Lead" }))

    expect(screen.queryByRole("group", { hidden: true, name: "Role" })).not.toBeInTheDocument()
  })

  it("keeps every option of a short list at once from the keyboard", async () => {
    const user = userEvent.setup()
    renderGrid({ columns: TEAM_CHOICES })

    await openFilter(user, "Team")
    await user.keyboard("{Control>}a{/Control}")

    expect(within(chip("Team")).getByRole("button", { hidden: true, name: "Team: Compilers or Kernels" })).toBeInTheDocument()
  })
})

describe("data grid range filters", () => {
  it("filters a number range from a lower bound, then between two bounds", async () => {
    const user = userEvent.setup()
    renderGrid()

    const dialog = await openFilter(user, "Age")
    await user.paste("40")
    await user.tab()
    expect(columnTexts("Name")).toStrictEqual(["Grace", "Alan"])
    expect(within(chip("Age")).getByRole("button", { hidden: true, name: "Age: at least 40" })).toBeInTheDocument()

    await user.click(within(dialog).getByRole("textbox", { name: filters.range.max }))
    await user.paste("44")
    await user.tab()
    expect(columnTexts("Name")).toStrictEqual(["Alan"])
    expect(within(chip("Age")).getByRole("button", { hidden: true, name: "Age: 40 – 44" })).toBeInTheDocument()
  })

  it("filters a number range from an upper bound and drops it when both bounds are cleared", async () => {
    const user = userEvent.setup()
    renderGrid()

    const dialog = await openFilter(user, "Age")
    await user.tab()
    await user.paste("44")
    await user.tab()
    expect(within(chip("Age")).getByRole("button", { hidden: true, name: "Age: at most 44" })).toBeInTheDocument()

    await user.clear(within(dialog).getByRole("textbox", { name: filters.range.max }))
    await user.tab()
    expect(screen.queryByRole("group", { hidden: true, name: "Age" })).not.toBeInTheDocument()
  })

  it("filters the days of a date column from a preset, in the visitor's time zone", async () => {
    vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true, toFake: ["Date"] })
    const user = userEvent.setup()
    renderGrid()

    const dialog = await openFilter(user, "Joined")
    await user.click(within(dialog).getByRole("button", { name: filters.date.last12Months }))
    expect(columnTexts("Name")).toStrictEqual(["Ada", "Grace"])
    await user.click(within(dialog).getByRole("button", { name: filters.date.last30Days }))
    expect(columnTexts("Name")).toStrictEqual(["Ada", "Grace"])
    await user.click(within(dialog).getByRole("button", { name: filters.date.last7Days }))
    expect(columnTexts("Name")).toStrictEqual(["Ada"])
    expect(within(chip("Joined")).getByRole("button", { hidden: true, name: "Joined: Nov 16, 2026 – Nov 22, 2026" })).toBeInTheDocument()
  })

  it("filters the days picked on the calendar", async () => {
    vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true, toFake: ["Date"] })
    const user = userEvent.setup()
    renderGrid()

    const dialog = await openFilter(user, "Joined")
    await user.click(within(dialog).getByRole("button", { name: filters.date.last7Days }))
    const calendar = within(dialog).getByRole("application", { name: /Joined/u })
    await user.click(within(calendar).getByRole("button", { name: /November 1, 2026/u }))
    await user.click(within(calendar).getByRole("button", { name: /November 2, 2026/u }))

    expect(columnTexts("Name")).toStrictEqual(["Grace"])
    expect(within(chip("Joined")).getByRole("button", { hidden: true, name: "Joined: Nov 1, 2026 – Nov 2, 2026" })).toBeInTheDocument()
  })

  it("reads the days in UTC when the page sets no time zone", async () => {
    vi.useFakeTimers({ now: NOW, shouldAdvanceTime: true, toFake: ["Date"] })
    const user = userEvent.setup()
    renderGrid({}, { withoutTimeZone: true })

    await user.click(within(await openFilter(user, "Joined")).getByRole("button", { name: filters.date.last7Days }))

    expect(columnTexts("Name")).toStrictEqual(["Ada"])
  })

  it("removes a filter from its chip", async () => {
    const user = userEvent.setup()
    renderGrid()

    await user.click(within(await openFilter(user, "Team")).getByRole("option", { name: "Compilers" }))
    await closePopover(user)
    await user.click(screen.getByRole("button", { name: "Remove the Team filter" }))

    expect(columnTexts("Name")).toHaveLength(3)
  })

  it("clears a filter from its editor", async () => {
    const user = userEvent.setup()
    renderGrid()

    const dialog = await openFilter(user, "Team")
    await user.click(within(dialog).getByRole("option", { name: "Kernels" }))
    await user.click(within(dialog).getByRole("button", { name: filters.clear }))

    expect(columnTexts("Name")).toHaveLength(3)
  })

  it("clears every filter at once", async () => {
    const user = userEvent.setup()
    renderGrid()

    await user.click(within(await openFilter(user, "Team")).getByRole("option", { name: "Kernels" }))
    await closePopover(user)
    await user.click(screen.getByRole("button", { name: filters.clearAll }))

    expect(screen.queryByRole("group", { name: filters.active })).not.toBeInTheDocument()
    expect(columnTexts("Name")).toHaveLength(3)
  })
})
