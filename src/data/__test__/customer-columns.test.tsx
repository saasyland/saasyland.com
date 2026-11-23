import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { CUSTOMER_COLUMNS, type CustomerColumn } from "~/src/data/customer-columns"
import * as AREA_CUSTOMER_COLUMNS from "~/src/data/customer-columns.entries"
import { LICENSE_CUSTOMER_COLUMNS } from "~/src/data/license.customer-columns"
import { PAYMENTS_CUSTOMER_COLUMNS } from "~/src/data/payments.customer-columns"

import { CustomerMachines } from "~/src/presentation/components/custom/admin/users/license-machines"

const column = (key: string): CustomerColumn => ({ Cell: () => <span />, header: key, key })

const composeWith = (areas: Readonly<Record<string, readonly CustomerColumn[]>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/customer-columns.entries", () => areas)

  return import("~/src/data/customer-columns")
}

afterEach(() => {
  vi.doUnmock("~/src/data/customer-columns.entries")
})

describe("customer table columns from other areas", () => {
  it("adds the columns of every area once, each with its own key", () => {
    const declared = Object.values(AREA_CUSTOMER_COLUMNS).flat()

    expect(CUSTOMER_COLUMNS).toStrictEqual(declared)
    expect(new Set(declared.map(({ key }) => key)).size).toBe(declared.length)
  })

  it("orders the columns by area", async () => {
    const first = column("first")
    const second = column("second")

    const columns = await composeWith({ FIRST_CUSTOMER_COLUMNS: [first], SECOND_CUSTOMER_COLUMNS: [second] })

    expect(columns.CUSTOMER_COLUMNS).toStrictEqual([first, second])
  })

  it("leaves the table with the payments area's own columns when no area adds one", async () => {
    const columns = await composeWith({ PAYMENTS_CUSTOMER_COLUMNS })

    expect(columns.CUSTOMER_COLUMNS).toStrictEqual([])
  })

  it("adds the machines each customer's licence has activated, from the licence area", () => {
    expect(LICENSE_CUSTOMER_COLUMNS).toStrictEqual([
      { Cell: CustomerMachines, header: "pages.admin.users.license.activations.header", key: "machines" },
    ])
  })
})
