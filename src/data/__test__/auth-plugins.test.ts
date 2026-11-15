import { describe, expect, it, vi } from "vite-plus/test"

import { AUTH_PLUGINS, DISABLED_AUTH_PATHS, RATE_LIMIT_EXEMPT_AUTH_PATHS } from "~/src/data/auth-plugins"
import * as AREA_AUTH_PLUGINS from "~/src/data/auth-plugins.entries"

const ENTRIES = Object.values(AREA_AUTH_PLUGINS).flat()

describe("auth plugin composition", () => {
  it("adds the plugin of every entry an area declares, in the order of the areas", () => {
    expect(AUTH_PLUGINS).toStrictEqual(ENTRIES.map(({ plugin }) => plugin))
  })

  it("joins the paths every area closes to HTTP or exempts from rate limiting", () => {
    expect(DISABLED_AUTH_PATHS).toStrictEqual(ENTRIES.flatMap(({ disabledPaths }) => disabledPaths))
    expect(RATE_LIMIT_EXEMPT_AUTH_PATHS).toStrictEqual(ENTRIES.flatMap(({ rateLimitExemptPaths }) => rateLimitExemptPaths))
  })

  it("adds nothing when no area declares a plugin", async () => {
    vi.resetModules()
    vi.doMock("~/src/data/auth-plugins.entries", () => ({}))

    const plugins = await import("~/src/data/auth-plugins")

    expect(plugins.AUTH_PLUGINS).toStrictEqual([])
    expect(plugins.DISABLED_AUTH_PATHS).toStrictEqual([])
    expect(plugins.RATE_LIMIT_EXEMPT_AUTH_PATHS).toStrictEqual([])
    vi.doUnmock("~/src/data/auth-plugins.entries")
  })
})
