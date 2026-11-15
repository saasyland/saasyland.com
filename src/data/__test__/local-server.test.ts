import { describe, expect, it, vi } from "vite-plus/test"

import { ENVIRONMENT, appHostsForMode } from "~/src/modules/_core/constants/api"

import { LOCAL_SERVER, LOCAL_SERVER_ORIGIN } from "~/src/data/local-server"

import playwrightConfig from "~/playwright.config"
import viteConfig from "~/vite.config"

vi.mock(import("~/src/data/vite"), () => ({ vitePlugins: () => Promise.resolve([]) }))

describe("local server", () => {
  it("binds the preview server that prerendering crawls to the loopback address, so no request resolves localhost", () => {
    expect(viteConfig({ command: "serve", isPreview: true, mode: ENVIRONMENT.TEST }).preview).toStrictEqual({
      host: LOCAL_SERVER.HOST,
      port: LOCAL_SERVER.PORT,
    })
  })

  it("sends the browser suite to the address the preview server binds", () => {
    expect(playwrightConfig.use?.baseURL).toBe(LOCAL_SERVER_ORIGIN)
    expect(playwrightConfig.webServer).toHaveProperty("url", LOCAL_SERVER_ORIGIN)
  })

  it("is a host the test build trusts", () => {
    expect(appHostsForMode(ENVIRONMENT.TEST)).toContain(new URL(LOCAL_SERVER_ORIGIN).host)
  })
})
