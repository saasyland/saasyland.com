import { describe, expect, it } from "vite-plus/test"

import { dataGridFeatures, isDateInRange, isNumberInRange } from "~/src/integrations/tanstack-table/table.features"

const { dateInRange, numberInRange } = dataGridFeatures.filterFns

describe("data grid range filters", () => {
  it("keeps the numbers inside a range, the bounds included, open at either end", () => {
    expect(isNumberInRange(10, { max: 10, min: 10 })).toBe(true)
    expect(isNumberInRange(9, { min: 10 })).toBe(false)
    expect(isNumberInRange(11, { max: 10 })).toBe(false)
    expect(isNumberInRange(5, {})).toBe(true)
    expect(isNumberInRange("5", { min: 1 })).toBe(false)
  })

  it("keeps the dates inside a range of moments, open at either end", () => {
    const moment = new Date("2026-11-20T12:00:00.000Z")

    expect(isDateInRange(moment, { from: moment.getTime(), to: moment.getTime() })).toBe(true)
    expect(isDateInRange(moment, { from: moment.getTime() + 1 })).toBe(false)
    expect(isDateInRange(moment, { to: moment.getTime() - 1 })).toBe(false)
    expect(isDateInRange(moment, {})).toBe(true)
    expect(isDateInRange(moment.getTime(), {})).toBe(false)
  })

  it("drops a range without bounds", () => {
    expect(numberInRange.autoRemove?.({})).toBe(true)
    expect(numberInRange.autoRemove?.({ max: 1 })).toBe(false)
    expect(numberInRange.autoRemove?.({ min: 1 })).toBe(false)
    expect(dateInRange.autoRemove?.({})).toBe(true)
    expect(dateInRange.autoRemove?.({ to: 1 })).toBe(false)
    expect(dateInRange.autoRemove?.({ from: 1 })).toBe(false)
  })
})
