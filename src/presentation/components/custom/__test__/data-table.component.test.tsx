import type { JSX, ReactNode } from "react"

import { createColumnHelper } from "@tanstack/react-table"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { TestProviders, renderWithRouter as render } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { DataTable, type DataTableColumnDef, type DataTableFeatures } from "~/src/presentation/components/custom/data-table"

interface Person {
  id: string
  name: string
}

const ROWS: Person[] = [
  { id: "1", name: "Ada" },
  { id: "2", name: "Grace" },
  { id: "3", name: "Alan" },
]

const columnHelper = createColumnHelper<DataTableFeatures, Person>()

const COLUMNS: DataTableColumnDef<Person>[] = columnHelper.columns([columnHelper.accessor("name", { header: "Name", id: "name" })])

const ID_PAD = 2
const NO_ROWS: Person[] = []
const PAGE_SIZE = 10
const PAGED_ROW_COUNT = 12
const PAGED_ROWS: Person[] = Array.from({ length: PAGED_ROW_COUNT }, (_, index) => ({
  id: String(index),
  name: `Person ${String(index).padStart(ID_PAD, "0")}`,
}))

const EXPECTED_ROW_COUNT = 3
const SELECTED_AFTER_ONE_CLICK = 1
const FIRST_ROW_CHECKBOX = 0
const HEADER_ROW_COUNT = 1

const rowCheckbox = (): HTMLElement => screen.getAllByRole("checkbox", { name: "Select row" })[FIRST_ROW_CHECKBOX]!
const firstBodyRow = (): HTMLElement => screen.getAllByRole("row")[HEADER_ROW_COUNT]!

const renderTable = (data: Person[] = ROWS): void => {
  const messages = getTestMessages("en-US")

  const Wrapper = ({ children }: { children: ReactNode }): JSX.Element => (
    <IntlProvider locale="en-US" messages={messages}>
      {children}
    </IntlProvider>
  )

  render(<DataTable columns={COLUMNS} data={data} options={{ selectable: true }} />, { wrapper: Wrapper })
}

describe("data table component", () => {
  it("renders a row per record plus the header row", () => {
    expect.hasAssertions()
    renderTable()

    expect(screen.getByRole("columnheader", { name: "Name" })).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(EXPECTED_ROW_COUNT + HEADER_ROW_COUNT)
    expect(screen.getByText("Grace")).toBeInTheDocument()
  })

  it("shows the empty state when there are no rows", () => {
    expect.hasAssertions()
    renderTable(NO_ROWS)

    expect(screen.getByText("No results.")).toBeInTheDocument()
  })

  it("reflects selection on the row checkbox itself, and deselects again", async () => {
    expect.hasAssertions()
    const user = userEvent.setup()
    renderTable()

    expect(rowCheckbox()).not.toBeChecked()

    await user.click(rowCheckbox())
    expect(rowCheckbox()).toBeChecked()
    expect(screen.getByText(`${SELECTED_AFTER_ONE_CLICK} selected`)).toBeInTheDocument()

    await user.click(rowCheckbox())
    expect(rowCheckbox()).not.toBeChecked()
    expect(screen.queryByText(`${SELECTED_AFTER_ONE_CLICK} selected`)).not.toBeInTheDocument()
  })

  it("puts the header checkbox in a mixed state when only some rows are selected", async () => {
    expect.hasAssertions()
    const user = userEvent.setup()
    renderTable()

    const selectAll = screen.getByRole("checkbox", { name: "Select all rows" })
    expect(selectAll).not.toBePartiallyChecked()

    await user.click(screen.getAllByRole("checkbox", { name: "Select row" })[FIRST_ROW_CHECKBOX]!)
    expect(selectAll).toBePartiallyChecked()
    expect(selectAll).not.toBeChecked()
  })

  it("selects and clears every row from the header checkbox", async () => {
    expect.hasAssertions()
    const user = userEvent.setup()
    renderTable()

    const selectAll = screen.getByRole("checkbox", { name: "Select all rows" })

    await user.click(selectAll)
    expect(screen.getByText(`${EXPECTED_ROW_COUNT} selected`)).toBeInTheDocument()
    for (const checkbox of screen.getAllByRole("checkbox", { name: "Select row" })) {
      expect(checkbox).toBeChecked()
    }

    await user.click(selectAll)
    expect(screen.queryByText(`${EXPECTED_ROW_COUNT} selected`)).not.toBeInTheDocument()
    for (const checkbox of screen.getAllByRole("checkbox", { name: "Select row" })) {
      expect(checkbox).not.toBeChecked()
    }
  })

  it("sorts by a column header", async () => {
    expect.hasAssertions()
    const user = userEvent.setup()
    renderTable()

    await user.click(screen.getByRole("button", { name: /Name/u }))

    expect(within(firstBodyRow()).getByText("Ada")).toBeInTheDocument()
  })

  it("toggles a column through ascending, descending, and back", async () => {
    expect.hasAssertions()
    const user = userEvent.setup()
    renderTable()

    const header = screen.getByRole("button", { name: /Name/u })

    expect(screen.getByRole("columnheader", { name: /Name/u })).toHaveAttribute("aria-sort", "none")

    await user.click(header)
    expect(within(firstBodyRow()).getByText("Ada")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /Name/u })).toHaveAttribute("aria-sort", "ascending")

    await user.click(header)
    expect(within(firstBodyRow()).getByText("Grace")).toBeInTheDocument()
    expect(screen.getByRole("columnheader", { name: /Name/u })).toHaveAttribute("aria-sort", "descending")
  })

  it("pages forward and back once the rows exceed a page", async () => {
    expect.hasAssertions()
    const user = userEvent.setup()
    renderTable(PAGED_ROWS)

    expect(screen.getAllByRole("row")).toHaveLength(PAGE_SIZE + HEADER_ROW_COUNT)
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Next page" }))
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(PAGED_ROW_COUNT - PAGE_SIZE + HEADER_ROW_COUNT)

    await user.click(screen.getByRole("button", { name: "Previous page" }))
    expect(screen.getByText("Page 1 of 2")).toBeInTheDocument()
  })

  it("returns to the first page when new data arrives", async () => {
    const user = userEvent.setup()
    const messages = getTestMessages("en-US")
    const table = (data: Person[]): JSX.Element => (
      <IntlProvider locale="en-US" messages={messages}>
        <DataTable columns={COLUMNS} data={data} />
      </IntlProvider>
    )
    const { queryClient, rerender, router } = render(table(PAGED_ROWS))

    await user.click(screen.getByRole("button", { name: "Next page" }))
    expect(screen.getByText("Page 2 of 2")).toBeInTheDocument()

    rerender(
      <TestProviders queryClient={queryClient} router={router}>
        {table(PAGED_ROWS.toReversed())}
      </TestProviders>,
    )

    expect(await screen.findByText("Page 1 of 2")).toBeInTheDocument()
    expect(within(firstBodyRow()).getByText("Person 11")).toBeInTheDocument()
    expect(screen.getAllByRole("row")).toHaveLength(PAGE_SIZE + HEADER_ROW_COUNT)
  })
})

describe("data table filters", () => {
  it("narrows rows with search and select filters and restores them", async () => {
    const user = userEvent.setup()
    const messages = getTestMessages("en-US")
    render(
      <IntlProvider locale="en-US" messages={messages}>
        <DataTable
          columns={COLUMNS}
          data={ROWS}
          filters={[
            { columnId: "name", placeholder: "Search people", type: "search" },
            { columnId: "name", label: "Everyone", options: [{ label: "Only Grace", value: "Grace" }], type: "select" },
          ]}
        />
      </IntlProvider>,
    )

    await user.type(screen.getByRole("textbox", { name: "Search people" }), "ad")
    expect(screen.getAllByRole("row")).toHaveLength(HEADER_ROW_COUNT + SELECTED_AFTER_ONE_CLICK)
    expect(screen.getByText("Ada")).toBeInTheDocument()

    await user.clear(screen.getByRole("textbox", { name: "Search people" }))
    expect(screen.getAllByRole("row")).toHaveLength(EXPECTED_ROW_COUNT + HEADER_ROW_COUNT)

    await user.click(screen.getByRole("button", { name: /Everyone/u }))
    await user.click(await screen.findByRole("option", { name: "Only Grace" }))
    expect(screen.getAllByRole("row")).toHaveLength(HEADER_ROW_COUNT + SELECTED_AFTER_ONE_CLICK)
    expect(screen.queryByText("Alan")).not.toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: /Everyone/u }))
    await user.click(await screen.findByRole("option", { name: "Everyone" }))
    expect(screen.getAllByRole("row")).toHaveLength(EXPECTED_ROW_COUNT + HEADER_ROW_COUNT)
    expect(screen.getByText("Alan")).toBeInTheDocument()
  })
})
