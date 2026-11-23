import { describe, expect, it } from "vite-plus/test"

import { nextPosition, reorder } from "~/src/modules/_core/utils/ordering"

const ITEMS = [
  { id: "a", position: 1 },
  { id: "b", position: 2 },
  { id: "c", position: 3 },
  { id: "d", position: 4 },
]

const SPARSE = [
  { id: "a", position: 1 },
  { id: "b", position: 4 },
  { id: "c", position: 9 },
]

describe("ordering", () => {
  it("moves an item to any place and returns only the items whose position changes", () => {
    expect(reorder(ITEMS, "d", 1)).toStrictEqual([
      { id: "d", position: 1 },
      { id: "a", position: 2 },
      { id: "b", position: 3 },
      { id: "c", position: 4 },
    ])
    expect(reorder(ITEMS, "a", 3)).toStrictEqual([
      { id: "b", position: 1 },
      { id: "c", position: 2 },
      { id: "a", position: 3 },
    ])
    expect(reorder(ITEMS, "b", 3)).toStrictEqual([
      { id: "c", position: 2 },
      { id: "b", position: 3 },
    ])
  })

  it("keeps a place past either end at that end", () => {
    expect(reorder(ITEMS, "b", 0)).toStrictEqual([
      { id: "b", position: 1 },
      { id: "a", position: 2 },
    ])
    expect(reorder(ITEMS, "c", 40)).toStrictEqual([
      { id: "d", position: 3 },
      { id: "c", position: 4 },
    ])
  })

  it("numbers a sparse list from one", () => {
    expect(reorder(SPARSE, "a", 1)).toStrictEqual([
      { id: "b", position: 2 },
      { id: "c", position: 3 },
    ])
  })

  it("changes nothing for an item already in its place or an unknown item", () => {
    expect(reorder(ITEMS, "b", 2)).toStrictEqual([])
    expect(reorder(ITEMS, "z", 1)).toStrictEqual([])
  })

  it("places a new item after the highest position", () => {
    expect(nextPosition(SPARSE)).toBe(10)
    expect(nextPosition([])).toBe(1)
  })
})
