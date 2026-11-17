import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { IDLE_FALLBACK_DELAY_MS, preloadWhenIdle } from "~/src/lib/idle-preload"

const IDLE_HANDLE = 7

const idleCallbacks: IdleRequestCallback[] = []
const requestIdle = vi.fn<(callback: IdleRequestCallback) => number>((callback) => {
  idleCallbacks.push(callback)
  return IDLE_HANDLE
})
const cancelIdle = vi.fn<(handle: number) => void>()

const runIdleCallbacks = (): void => {
  for (const callback of idleCallbacks.splice(0)) {
    callback({ didTimeout: false, timeRemaining: () => 0 })
  }
}

const setReadyState = (state: DocumentReadyState): void => {
  vi.spyOn(document, "readyState", "get").mockReturnValue(state)
}

const finishLoading = (): void => {
  setReadyState("complete")
  globalThis.dispatchEvent(new Event("load"))
}

beforeEach(() => {
  idleCallbacks.length = 0
  vi.clearAllMocks()
  vi.stubGlobal("requestIdleCallback", requestIdle)
  vi.stubGlobal("cancelIdleCallback", cancelIdle)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe("a page that has loaded", () => {
  it("preloads only once the browser reports that it is idle", () => {
    const preload = vi.fn<() => void>()
    setReadyState("complete")

    preloadWhenIdle(preload)

    expect(requestIdle).toHaveBeenCalledOnce()
    expect(preload).not.toHaveBeenCalled()
    runIdleCallbacks()
    expect(preload).toHaveBeenCalledOnce()
  })

  it("cancels the idle callback when the caller stops waiting", () => {
    const preload = vi.fn<() => void>()
    setReadyState("complete")

    preloadWhenIdle(preload)()

    expect(cancelIdle).toHaveBeenCalledWith(IDLE_HANDLE)
  })
})

describe("a page that is still loading", () => {
  it("waits for the load event before it waits for idle", () => {
    const preload = vi.fn<() => void>()
    setReadyState("interactive")

    preloadWhenIdle(preload)

    expect(requestIdle).not.toHaveBeenCalled()
    finishLoading()
    expect(requestIdle).toHaveBeenCalledOnce()
    runIdleCallbacks()
    expect(preload).toHaveBeenCalledOnce()
  })

  it("schedules nothing after the load event when the caller stopped waiting before it", () => {
    const preload = vi.fn<() => void>()
    setReadyState("loading")

    preloadWhenIdle(preload)()
    finishLoading()

    expect(requestIdle).not.toHaveBeenCalled()
    expect(preload).not.toHaveBeenCalled()
  })
})

describe("a browser without requestIdleCallback", () => {
  beforeEach(() => {
    vi.unstubAllGlobals()
    vi.useFakeTimers()
    setReadyState("complete")
  })

  it("preloads a fixed delay after the page has loaded", () => {
    const preload = vi.fn<() => void>()

    preloadWhenIdle(preload)

    expect("requestIdleCallback" in globalThis).toBe(false)
    vi.advanceTimersByTime(IDLE_FALLBACK_DELAY_MS - 1)
    expect(preload).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(preload).toHaveBeenCalledOnce()
  })

  it("clears the timer when the caller stops waiting", () => {
    const preload = vi.fn<() => void>()

    preloadWhenIdle(preload)()
    vi.advanceTimersByTime(IDLE_FALLBACK_DELAY_MS)

    expect(preload).not.toHaveBeenCalled()
  })
})

describe("a visitor who has turned on data saver", () => {
  it("never preloads, after the page has loaded or once the browser is idle", () => {
    const preload = vi.fn<() => void>()
    vi.stubGlobal("navigator", { connection: { saveData: true } })
    setReadyState("loading")

    preloadWhenIdle(preload)
    finishLoading()

    expect(requestIdle).not.toHaveBeenCalled()
    expect(preload).not.toHaveBeenCalled()
  })

  it("still preloads for a visitor whose connection does not save data", () => {
    const preload = vi.fn<() => void>()
    vi.stubGlobal("navigator", { connection: { saveData: false } })
    setReadyState("complete")

    preloadWhenIdle(preload)
    runIdleCallbacks()

    expect(preload).toHaveBeenCalledOnce()
  })
})
