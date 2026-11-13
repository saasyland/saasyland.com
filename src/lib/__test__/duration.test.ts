import { describe, expect, it } from "vite-plus/test"

import { formatClock } from "~/src/lib/duration"

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
