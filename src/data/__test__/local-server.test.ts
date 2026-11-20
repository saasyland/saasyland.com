import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ENVIRONMENT, appHostsForMode } from "~/src/modules/_core/constants/api"

import { LOCAL_SERVER, LOCAL_SERVER_ORIGIN, TEST_SERVER_PORTS } from "~/src/data/local-server"

import playwrightConfig from "~/playwright.config"
import viteConfig from "~/vite.config"

vi.mock(import("~/src/data/vite"), () => ({ vitePlugins: () => Promise.resolve([]) }))

afterEach(() => {
  vi.unstubAllEnvs()
})

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

describe("browser suite port", () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it("serves and opens the port of PLAYWRIGHT_BASE_URL, the one place a worktree chooses it", async () => {
    const url = `http://${LOCAL_SERVER.HOST}:${String(TEST_SERVER_PORTS.LAST)}`
    vi.stubEnv("PLAYWRIGHT_BASE_URL", url)

    const { SERVER_PORT, default: config } = await import("~/playwright.config")

    expect(SERVER_PORT).toBe(String(TEST_SERVER_PORTS.LAST))
    expect(config.use?.baseURL).toBe(url)
    expect(config.webServer).toHaveProperty("url", url)
    expect(config.webServer).toHaveProperty(
      "command",
      expect.stringContaining(`bun run start:test --port ${String(TEST_SERVER_PORTS.LAST)}`),
    )
  })

  it("refuses a port the test build does not trust before it builds anything", async () => {
    const host = `${LOCAL_SERVER.HOST}:${String(TEST_SERVER_PORTS.LAST + 1)}`
    vi.stubEnv("PLAYWRIGHT_BASE_URL", `http://${host}`)

    await expect(import("~/playwright.config")).rejects.toThrow(`The test build does not trust ${host}.`)
  })

  it("checks the server on that port before the first test", () => {
    expect(playwrightConfig.globalSetup).toBe("./e2e/global-setup.ts")
  })
})
