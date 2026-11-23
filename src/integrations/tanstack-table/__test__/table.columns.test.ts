import { createColumnHelper } from "@tanstack/react-table"
import { describe, expect, it } from "vite-plus/test"

import {
  ACTIONS_COLUMN_ID,
  NO_FIXED_COLUMNS,
  REORDER_COLUMN_ID,
  SELECT_COLUMN_ID,
  columnIdOf,
  defaultPinning,
  defaultVisibility,
  isDataColumn,
  moveColumn,
  withFixedColumnsPinned,
} from "~/src/integrations/tanstack-table/table.columns"
import { DATA_GRID_PIN, type DataGridFeatures } from "~/src/integrations/tanstack-table/table.features"

interface Person {
  readonly address: { readonly city: string }
  readonly id: string
  readonly name: string
}

const helper = createColumnHelper<DataGridFeatures, Person>()

const COLUMNS = helper.columns([
  helper.accessor("name", { header: "Name", meta: { pinned: DATA_GRID_PIN.START } }),
  helper.accessor("address.city", { header: "City", meta: { hidden: true } }),
  helper.accessor("id", { header: "ID", id: "identifier", meta: { pinned: DATA_GRID_PIN.END } }),
  helper.display({ header: "Notes" }),
  helper.display({ header: () => "Actions", id: "actions" }),
])

describe("data grid columns", () => {
  it("names a column the way TanStack Table does", () => {
    expect(COLUMNS.map((column) => columnIdOf(column))).toStrictEqual(["name", "address_city", "identifier", "Notes", "actions"])
  })

  it("hides and pins the columns their meta asks for", () => {
    expect(defaultVisibility(COLUMNS)).toStrictEqual({ address_city: false })
    expect(defaultPinning(COLUMNS)).toStrictEqual({ end: ["identifier"], start: ["name"] })
  })

  it("keeps the selection and handle columns first and the actions column last among the pinned columns, and only when the grid has them", () => {
    const pinning = {
      end: [SELECT_COLUMN_ID, ACTIONS_COLUMN_ID, "identifier"],
      start: ["name", ACTIONS_COLUMN_ID, REORDER_COLUMN_ID, SELECT_COLUMN_ID],
    }

    expect(withFixedColumnsPinned(pinning, { actions: true, reorderable: true, selectable: true })).toStrictEqual({
      end: ["identifier", ACTIONS_COLUMN_ID],
      start: [SELECT_COLUMN_ID, REORDER_COLUMN_ID, "name"],
    })
    expect(withFixedColumnsPinned(pinning, NO_FIXED_COLUMNS)).toStrictEqual({ end: ["identifier"], start: ["name"] })
  })

  it("tells the columns that hold data from the selection, handle and actions columns", () => {
    expect([SELECT_COLUMN_ID, REORDER_COLUMN_ID, ACTIONS_COLUMN_ID, "name"].map((id) => isDataColumn(id))).toStrictEqual([
      false,
      false,
      false,
      true,
    ])
  })

  it("moves a column onto another one's place from either side", () => {
    const order = ["a", "b", "c", "d"]

    expect(moveColumn(order, "a", "c")).toStrictEqual(["b", "c", "a", "d"])
    expect(moveColumn(order, "d", "b")).toStrictEqual(["a", "d", "b", "c"])
    expect(moveColumn(order, "b", "c")).toStrictEqual(["a", "c", "b", "d"])
  })
})
