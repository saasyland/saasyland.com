import { describe, expect, it } from "vite-plus/test"

import {
  DEFAULT_TIME_RANGE,
  TIME_BUCKET,
  TIME_RANGE,
  TIME_RANGES,
  bucketKey,
  pointsOf,
  timeRangeSchema,
  timeSeries,
} from "~/src/lib/time-series"

const NOW = new Date("2026-03-01T00:30:00.000Z")

const isoDays = (dates: readonly Date[]): string[] => dates.map((date) => date.toISOString().slice(0, 10))

describe("time series", () => {
  it("ends the last 7 days on today's UTC day, across the end of February", () => {
    const series = timeSeries(TIME_RANGE.LAST_7_DAYS, NOW)

    expect(series.bucket).toBe(TIME_BUCKET.DAY)
    expect(isoDays(series.starts)).toStrictEqual([
      "2026-02-23",
      "2026-02-24",
      "2026-02-25",
      "2026-02-26",
      "2026-02-27",
      "2026-02-28",
      "2026-03-01",
    ])
    expect(series.since).toStrictEqual(series.starts[0])
  })

  it("covers 30 UTC days", () => {
    const series = timeSeries(TIME_RANGE.LAST_30_DAYS, NOW)

    expect(series.starts).toHaveLength(30)
    expect(series.since).toStrictEqual(new Date("2026-01-31T00:00:00.000Z"))
  })

  it("covers 12 UTC months, this one included, across the turn of the year", () => {
    const series = timeSeries(TIME_RANGE.LAST_12_MONTHS, NOW)

    expect(series.bucket).toBe(TIME_BUCKET.MONTH)
    expect(series.starts.map((start) => bucketKey(start, series.bucket))).toStrictEqual([
      "2025-04",
      "2025-05",
      "2025-06",
      "2025-07",
      "2025-08",
      "2025-09",
      "2025-10",
      "2025-11",
      "2025-12",
      "2026-01",
      "2026-02",
      "2026-03",
    ])
    expect(series.since).toStrictEqual(new Date("2025-04-01T00:00:00.000Z"))
  })

  it("names a bucket the way SQLite's strftime does", () => {
    expect(bucketKey(new Date("2026-03-01T00:00:00.000Z"), TIME_BUCKET.DAY)).toBe("2026-03-01")
    expect(bucketKey(new Date("2026-03-01T00:00:00.000Z"), TIME_BUCKET.MONTH)).toBe("2026-03")
  })

  it("places each value in its bucket and fills the empty ones with zero", () => {
    const series = timeSeries(TIME_RANGE.LAST_7_DAYS, NOW)

    expect(pointsOf(series, new Map([["2026-02-28", 4]])).map(({ value }) => value)).toStrictEqual([0, 0, 0, 0, 0, 4, 0])
  })

  it("accepts the three periods and defaults to the last 30 days", () => {
    expect(TIME_RANGES.map((range) => timeRangeSchema.parse({ range }).range)).toStrictEqual([...TIME_RANGES])
    expect(timeRangeSchema.parse({})).toStrictEqual({ range: DEFAULT_TIME_RANGE })
    expect(timeRangeSchema.safeParse({ range: "1y" }).success).toBe(false)
  })
})
