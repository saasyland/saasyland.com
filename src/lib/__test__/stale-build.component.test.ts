import { afterEach, expect, it, vi } from "vite-plus/test"

import { claimReload, isStaleBuildError, listenForPreloadErrors } from "~/src/lib/stale-build"

const DESTINATION = "/blog"

const runBuild = (src: string): void => {
  const script = document.createElement("script")
  script.type = "module"
  script.src = src
  document.head.replaceChildren(script)
}

const failPreload = (error: Error): void => {
  globalThis.dispatchEvent(Object.assign(new Event("vite:preloadError"), { payload: error }))
}

afterEach(() => {
  vi.restoreAllMocks()
  sessionStorage.clear()
  document.head.replaceChildren()
})

it.each([
  "Failed to fetch dynamically imported module: https://saasyland.com/assets/_site._marketing.blog-BLaFCBnh.js",
  "error loading dynamically imported module: https://saasyland.com/assets/_site._marketing.blog-BLaFCBnh.js",
  "Importing a module script failed.",
])("recognises the error a browser raises for a missing chunk: %s", (message) => {
  expect(isStaleBuildError(new TypeError(message))).toBe(true)
})

it.each([new Error("private database details"), "Failed to fetch dynamically imported module", undefined])(
  "does not take %s for a missing chunk",
  (error) => {
    expect(isStaleBuildError(error)).toBe(false)
  },
)

it("recognises a dependency Vite failed to preload while it listens for them", () => {
  const stopListening = listenForPreloadErrors()
  const stylesheet = new Error("Unable to preload CSS for /assets/video-player-CQyycmlF.css")
  failPreload(stylesheet)
  stopListening()
  const afterwards = new Error("Unable to preload CSS for /assets/docs-B1yvD2kQ.css")
  failPreload(afterwards)

  expect(isStaleBuildError(stylesheet)).toBe(true)
  expect(isStaleBuildError(afterwards)).toBe(false)
})

it("claims one reload for each destination in each build", () => {
  runBuild("/assets/index-Cb2at9Gp.js")

  expect(claimReload(DESTINATION)).toBe(true)
  expect(claimReload(DESTINATION)).toBe(false)
  expect(claimReload("/docs")).toBe(true)

  runBuild("/assets/index-Cynr7XPe.js")

  expect(claimReload(DESTINATION)).toBe(true)
  expect(claimReload(DESTINATION)).toBe(false)
})

it("claims one reload for each destination when the page names no entry script", () => {
  expect(claimReload(DESTINATION)).toBe(true)
  expect(claimReload(DESTINATION)).toBe(false)
})

it("claims no reload when the browser refuses the session storage", () => {
  vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
    throw new DOMException("The operation is insecure.", "SecurityError")
  })

  expect(claimReload(DESTINATION)).toBe(false)
})
