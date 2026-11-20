import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import type { PurchaseEmailStep } from "~/src/data/purchase-email"
import * as AREA_PURCHASE_EMAIL from "~/src/data/purchase-email.entries"

const step = (key: string): PurchaseEmailStep => ({ key, line: () => Promise.resolve(undefined) })

const composeWith = (areas: Readonly<Record<string, readonly PurchaseEmailStep[]>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/purchase-email.entries", () => areas)

  return import("~/src/data/purchase-email")
}

afterEach(() => {
  vi.doUnmock("~/src/data/purchase-email.entries")
})

describe("purchase email composition", () => {
  it("adds the steps of every area once, each with its own key", async () => {
    const { PURCHASE_EMAIL_STEPS } = await import("~/src/data/purchase-email")
    const areas: Readonly<Record<string, readonly PurchaseEmailStep[]>> = AREA_PURCHASE_EMAIL
    const declared = Object.values(areas).flat()

    expect(PURCHASE_EMAIL_STEPS).toStrictEqual(declared)
    expect(new Set(declared.map(({ key }) => key)).size).toBe(declared.length)
  })

  it("orders the steps by area and ends with the licence's own when no area adds one", async () => {
    const first = step("first")
    const second = step("second")

    const composed = await composeWith({ FIRST_PURCHASE_EMAIL: [first], SECOND_PURCHASE_EMAIL: [second] })
    expect(composed.PURCHASE_EMAIL_STEPS).toStrictEqual([first, second])
    const empty = await composeWith({})
    expect(empty.PURCHASE_EMAIL_STEPS).toStrictEqual([])
  })
})
