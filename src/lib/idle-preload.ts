import * as zod from "zod"

export const IDLE_FALLBACK_DELAY_MS = 1000

const dataSaverSchema = zod.object({ connection: zod.object({ saveData: zod.literal(true) }) })

const whenIdle = (task: () => void, signal: AbortSignal): void => {
  if ("requestIdleCallback" in globalThis) {
    const handle = requestIdleCallback(task)
    signal.addEventListener("abort", () => {
      cancelIdleCallback(handle)
    })
    return
  }
  const timer = setTimeout(task, IDLE_FALLBACK_DELAY_MS)
  signal.addEventListener("abort", () => {
    clearTimeout(timer)
  })
}

const schedule = (preload: () => void, signal: AbortSignal): void => {
  if (dataSaverSchema.safeParse(navigator).success) {
    return
  }
  if (document.readyState === "complete") {
    whenIdle(preload, signal)
    return
  }
  globalThis.addEventListener(
    "load",
    () => {
      whenIdle(preload, signal)
    },
    { once: true, signal },
  )
}

export const preloadWhenIdle = (preload: () => void): (() => void) => {
  const controller = new AbortController()
  schedule(preload, controller.signal)
  return () => {
    controller.abort()
  }
}
