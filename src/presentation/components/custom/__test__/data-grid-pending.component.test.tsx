import { describe, expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { DEFAULT_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"

import { DataGridPending } from "~/src/presentation/components/custom/data-grid-pending"

const COLUMNS = [
  { cell: <span>name</span>, id: "name", width: 200 },
  { cell: <span>team</span>, id: "team", width: 120 },
]

describe("data grid skeleton", () => {
  it("draws the toolbar, a page of rows and the pagination inside one card, with the columns at their widths", () => {
    const { container } = renderWithRouter(<DataGridPending columns={COLUMNS} />)

    expect([...container.querySelectorAll("col")].map((col) => col.style.width)).toStrictEqual(["200px", "120px"])
    expect(container.querySelectorAll("tbody tr")).toHaveLength(DEFAULT_PAGE_SIZE)
    expect(container.querySelectorAll("thead th")).toHaveLength(COLUMNS.length)
  })

  it("adds the selection and actions columns when the grid has them", () => {
    const { container } = renderWithRouter(<DataGridPending actionsWidth={96} columns={COLUMNS} isSelectable />)

    expect([...container.querySelectorAll("col")].map((col) => col.style.width)).toStrictEqual(["", "200px", "120px", "96px"])
    expect(container.querySelectorAll("tbody tr:first-child td")).toHaveLength(COLUMNS.length + 2)
  })
})
