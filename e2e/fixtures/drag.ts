import type { Locator } from "@playwright/test"

interface Point {
  readonly x: number
  readonly y: number
}

interface DragPoints {
  readonly from: Point
  readonly to: Point
}

export const dragOnto = async (source: Locator, target: Locator, { from, to }: DragPoints): Promise<void> => {
  const { mouse } = source.page()
  await target.scrollIntoViewIfNeeded()
  await source.hover({ position: from })
  await mouse.down()
  await target.hover({ position: to })
  await target.hover({ position: to })
  await mouse.up()
}
