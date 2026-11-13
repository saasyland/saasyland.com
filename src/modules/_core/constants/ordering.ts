export const MOVE_DIRECTION = {
  DOWN: "down",
  UP: "up",
} as const

export const MOVE_DIRECTIONS = [MOVE_DIRECTION.UP, MOVE_DIRECTION.DOWN] as const

export type MoveDirection = (typeof MOVE_DIRECTIONS)[number]
