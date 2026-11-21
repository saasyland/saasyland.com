import confetti from "canvas-confetti"
import { expect, it, vi } from "vite-plus/test"

import { triggerConfetti } from "~/src/lib/confetti"

vi.mock("canvas-confetti", () => ({ default: vi.fn() }))

it("fires the configured bursts with a shared origin and 200 particles in total, and none for a visitor who prefers reduced motion", () => {
  triggerConfetti()

  const { calls } = vi.mocked(confetti).mock
  expect(calls).toHaveLength(5)
  expect(calls.map(([options]) => options?.particleCount)).toEqual([50, 40, 70, 20, 20])
  expect(calls.every(([options]) => options?.origin?.y === 0.7)).toBe(true)
  expect(calls.map(([options]) => options?.spread)).toEqual([26, 60, 100, 120, 120])
  expect(calls).toContainEqual([expect.objectContaining({ decay: 0.91, scalar: 0.8 })])
  expect(calls.every(([options]) => options?.disableForReducedMotion === true)).toBe(true)
})
