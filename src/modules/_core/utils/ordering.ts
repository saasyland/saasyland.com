import { FIRST_POSITION } from "~/src/modules/_core/constants/ordering"

interface Positioned {
  readonly id: string
  readonly position: number
}

export const reorder = (items: readonly Positioned[], id: string, position: number): Positioned[] => {
  const item = items.find((entry) => entry.id === id)

  if (item === undefined) {
    return []
  }

  const rest = items.filter((entry) => entry !== item)
  const index = Math.min(Math.max(position, FIRST_POSITION), items.length) - FIRST_POSITION

  return [...rest.slice(0, index), item, ...rest.slice(index)]
    .map((entry, place) => ({ entry, position: place + FIRST_POSITION }))
    .filter(({ entry, position: next }) => entry.position !== next)
    .map(({ entry, position: next }) => ({ id: entry.id, position: next }))
}

export const nextPosition = (items: readonly Pick<Positioned, "position">[]): number =>
  items.reduce((highest, entry) => Math.max(highest, entry.position), 0) + FIRST_POSITION
