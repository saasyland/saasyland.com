import { isModuleNotFoundError } from "@tanstack/router-core"

const PRELOAD_ERROR_EVENT = "vite:preloadError"

const LEAVE_EVENT = "beforeunload"

const STAY_EVENTS = ["pageshow", "pointerdown", "keydown"] as const

const RELOAD_KEY_PREFIX = "stale-build-reload:"

const ENTRY_SCRIPT = 'script[type="module"][src]'

const preloadErrors = new WeakSet<Error>()

let isLeaving = false

const rememberPreloadError = ({ payload }: VitePreloadErrorEvent): void => {
  preloadErrors.add(payload)
}

const leave = (): void => {
  isLeaving = true
}

const stay = (): void => {
  isLeaving = false
}

export const listenForStaleBuilds = (): (() => void) => {
  const listening = new AbortController()
  const { signal } = listening
  globalThis.addEventListener(PRELOAD_ERROR_EVENT, rememberPreloadError, { signal })
  globalThis.addEventListener(LEAVE_EVENT, leave, { signal })
  for (const event of STAY_EVENTS) {
    globalThis.addEventListener(event, stay, { capture: true, signal })
  }

  return () => {
    listening.abort()
  }
}

export const isStaleBuildError = (error: unknown): boolean =>
  isModuleNotFoundError(error) || (error instanceof Error && preloadErrors.has(error))

export const whenPageStays = (run: () => void): (() => void) => {
  const waiting = new AbortController()
  const stopWaiting = (): void => {
    waiting.abort()
  }

  if (!isLeaving) {
    run()
    return stopWaiting
  }

  for (const event of STAY_EVENTS) {
    globalThis.addEventListener(
      event,
      () => {
        stopWaiting()
        run()
      },
      { capture: true, signal: waiting.signal },
    )
  }

  return stopWaiting
}

const runningBuild = (): string => document.querySelector<HTMLScriptElement>(ENTRY_SCRIPT)?.src ?? ""

export const claimReload = (destination: string): boolean => {
  const key = `${RELOAD_KEY_PREFIX}${destination}`
  const build = runningBuild()

  try {
    if (sessionStorage.getItem(key) === build) {
      return false
    }

    sessionStorage.setItem(key, build)
    return true
  } catch {
    return false
  }
}
