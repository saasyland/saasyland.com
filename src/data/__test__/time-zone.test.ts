import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import type { TimeZoneSource } from "~/src/data/time-zone"

const composeWith = (areas: Readonly<Record<string, readonly TimeZoneSource[]>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/time-zone.entries", () => areas)

  return import("~/src/data/time-zone")
}

afterEach(() => {
  vi.doUnmock("~/src/data/time-zone.entries")
})

describe("time zone sources", () => {
  it("joins the sources of every area in the order the areas are declared", async () => {
    const first = { useTimeZone: () => "America/Los_Angeles" }
    const second = { useTimeZone: () => "Asia/Tokyo" }

    const { TIME_ZONE_SOURCES } = await composeWith({ FIRST_TIME_ZONES: [first], SECOND_TIME_ZONES: [second] })

    expect(TIME_ZONE_SOURCES).toStrictEqual([first, second])
  })

  it("has no source when no area supplies a time zone", async () => {
    const { TIME_ZONE_SOURCES } = await composeWith({})

    expect(TIME_ZONE_SOURCES).toStrictEqual([])
  })
})
