import { describe, expect, it } from "vite-plus/test"

import { formatClock, parseClock, wholeMinutes } from "~/src/lib/duration"

describe("formatClock", () => {
  it.each([
    { clock: "0:00", milliseconds: 0 },
    { clock: "0:01", milliseconds: 1499 },
    { clock: "0:02", milliseconds: 1500 },
    { clock: "12:34", milliseconds: 754_000 },
    { clock: "59:59", milliseconds: 3_599_000 },
    { clock: "1:00:00", milliseconds: 3_600_000 },
    { clock: "2:03:04", milliseconds: 7_384_000 },
  ])("formats $milliseconds ms as $clock", ({ clock, milliseconds }) => {
    expect(formatClock(milliseconds)).toBe(clock)
  })
})

describe("parseClock", () => {
  it.each([
    { clock: "0:00", seconds: 0 },
    { clock: "2:15", seconds: 135 },
    { clock: " 12:34 ", seconds: 754 },
    { clock: "75:00", seconds: 4500 },
    { clock: "1:02:03", seconds: 3723 },
  ])("reads $clock as $seconds seconds", ({ clock, seconds }) => {
    expect(parseClock(clock)).toBe(seconds)
  })

  it.each(["", "2", "2:5", "2:60", "1:60:00", "1:2:03", "a:bc", "-1:00"])("refuses %j", (clock) => {
    expect(parseClock(clock)).toBeUndefined()
  })

  it("reads every clock that formatClock writes", () => {
    for (const milliseconds of [0, 59_000, 3_599_000, 3_600_000, 7_384_000]) {
      expect(parseClock(formatClock(milliseconds))).toBe(milliseconds / 1000)
    }
  })
})

describe("wholeMinutes", () => {
  it.each([
    [0, 0],
    [2000, 1],
    [60_000, 1],
    [375_000, 7],
  ])("rounds %d ms up to %d minutes", (milliseconds, minutes) => {
    expect(wholeMinutes(milliseconds)).toBe(minutes)
  })
})
