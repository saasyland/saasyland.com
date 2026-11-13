import { describe, expect, it } from "vite-plus/test"

import { MOVE_DIRECTION } from "~/src/modules/_core/constants/ordering"
import { nextPosition, reorder } from "~/src/modules/_core/utils/ordering"

const ITEMS = [
  { id: "a", position: 1 },
  { id: "b", position: 4 },
  { id: "c", position: 9 },
]

describe("ordering", () => {
  it("swaps an item with its neighbour and renumbers from one", () => {
    expect(reorder(ITEMS, "b", MOVE_DIRECTION.UP)).toStrictEqual([
      { id: "b", position: 1 },
      { id: "a", position: 2 },
      { id: "c", position: 3 },
    ])
    expect(reorder(ITEMS, "b", MOVE_DIRECTION.DOWN)).toStrictEqual([
      { id: "a", position: 1 },
      { id: "c", position: 2 },
      { id: "b", position: 3 },
    ])
  })

  it("changes nothing past either end or for an unknown item", () => {
    expect(reorder(ITEMS, "a", MOVE_DIRECTION.UP)).toStrictEqual([])
    expect(reorder(ITEMS, "c", MOVE_DIRECTION.DOWN)).toStrictEqual([])
    expect(reorder(ITEMS, "z", MOVE_DIRECTION.DOWN)).toStrictEqual([])
  })

  it("places a new item after the highest position", () => {
    expect(nextPosition(ITEMS)).toBe(10)
    expect(nextPosition([])).toBe(1)
  })
})
