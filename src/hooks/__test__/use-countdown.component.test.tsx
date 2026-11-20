import { act, renderHook } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { useCountdown } from "~/src/hooks/use-countdown"

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("useCountdown", () => {
  it("counts the seconds down from the clock, and stops at zero", () => {
    const { result } = renderHook(() => useCountdown())
    expect(result.current.remainingSeconds).toBe(0)

    act(() => {
      result.current.start(3)
    })
    expect(result.current.remainingSeconds).toBe(3)

    act(() => {
      vi.advanceTimersByTime(1000)
    })
    expect(result.current.remainingSeconds).toBe(2)

    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(result.current.remainingSeconds).toBe(0)
    expect(vi.getTimerCount()).toBe(0)
  })

  it("restarts from the new length when started again, and leaves no timer behind once unmounted", () => {
    const { result, unmount } = renderHook(() => useCountdown())

    act(() => {
      result.current.start(10)
    })
    act(() => {
      vi.advanceTimersByTime(4000)
    })
    act(() => {
      result.current.start(2)
    })
    expect(result.current.remainingSeconds).toBe(2)

    unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
