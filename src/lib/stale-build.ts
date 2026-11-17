import { isModuleNotFoundError } from "@tanstack/router-core"

const PRELOAD_ERROR_EVENT = "vite:preloadError"

const RELOAD_KEY_PREFIX = "stale-build-reload:"

const ENTRY_SCRIPT = 'script[type="module"][src]'

const preloadErrors = new WeakSet<Error>()

const rememberPreloadError = ({ payload }: VitePreloadErrorEvent): void => {
  preloadErrors.add(payload)
}

export const listenForPreloadErrors = (): (() => void) => {
  globalThis.addEventListener(PRELOAD_ERROR_EVENT, rememberPreloadError)

  return () => {
    globalThis.removeEventListener(PRELOAD_ERROR_EVENT, rememberPreloadError)
  }
}

export const isStaleBuildError = (error: unknown): boolean =>
  isModuleNotFoundError(error) || (error instanceof Error && preloadErrors.has(error))

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
