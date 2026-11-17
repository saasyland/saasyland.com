import { MOVE_DIRECTION, type MoveDirection } from "~/src/modules/_core/constants/ordering"

interface Positioned {
  readonly id: string
  readonly position: number
}

export const reorder = (items: readonly Positioned[], id: string, direction: MoveDirection): Positioned[] => {
  const index = items.findIndex((entry) => entry.id === id)
  const target = direction === MOVE_DIRECTION.UP ? index - 1 : index + 1
  const item = items[index]
  const neighbour = items[target]

  if (item === undefined || neighbour === undefined) {
    return []
  }

  return items
    .with(index, neighbour)
    .with(target, item)
    .map((entry, position) => ({ id: entry.id, position: position + 1 }))
}

export const nextPosition = (items: readonly Pick<Positioned, "position">[]): number =>
  items.reduce((highest, entry) => Math.max(highest, entry.position), 0) + 1
