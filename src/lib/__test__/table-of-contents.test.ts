import { describe, expect, it } from "vite-plus/test"

import { type ReadingLayout, readingFrame } from "~/src/lib/table-of-contents"

const LAYOUT: ReadingLayout = {
  entries: [
    { height: 20, top: 0 },
    { height: 40, top: 20 },
    { height: 20, top: 60 },
  ],
  glide: 300,
  headings: [1000, 2000, 2400],
  line: 100,
}

describe("readingFrame", () => {
  it("marks no section and draws no thumb at the top of the page, before the first heading comes into view", () => {
    expect(readingFrame(LAYOUT, 0, true)).toStrictEqual({ active: -1, thumb: { height: 0, top: 0 } })
  })

  it("grows the thumb into the first entry while the first heading rises to the reading line", () => {
    expect(readingFrame(LAYOUT, 750, true)).toStrictEqual({ active: -1, thumb: { height: 10, top: 0 } })
  })

  it("rests the thumb on the section's entry until the next heading comes into view", () => {
    expect(readingFrame(LAYOUT, 1200, true)).toStrictEqual({ active: 0, thumb: { height: 20, top: 0 } })
  })

  it("glides and resizes the thumb toward the next entry as the next heading rises to the reading line", () => {
    expect(readingFrame(LAYOUT, 1750, true)).toStrictEqual({ active: 0, thumb: { height: 30, top: 10 } })
  })

  it("starts the glide at the section's own heading when the section is shorter than the glide", () => {
    expect(readingFrame(LAYOUT, 2000, true)).toStrictEqual({ active: 1, thumb: { height: 40, top: 20 } })
    expect(readingFrame(LAYOUT, 2150, true)).toStrictEqual({ active: 1, thumb: { height: 30, top: 40 } })
  })

  it("keeps the last section current with the thumb on its entry once its heading passes the reading line", () => {
    expect(readingFrame(LAYOUT, 5000, true)).toStrictEqual({ active: 2, thumb: { height: 20, top: 60 } })
  })

  it("keeps the thumb on the current entry without gliding when motion is reduced", () => {
    expect(readingFrame(LAYOUT, 1750, false)).toStrictEqual({ active: 0, thumb: { height: 20, top: 0 } })
    expect(readingFrame(LAYOUT, 750, false)).toStrictEqual({ active: -1, thumb: { height: 0, top: 0 } })
  })

  it("draws nothing for a page without headings", () => {
    expect(readingFrame({ entries: [], glide: 300, headings: [], line: 100 }, 400, true)).toStrictEqual({
      active: -1,
      thumb: { height: 0, top: 0 },
    })
  })
})
