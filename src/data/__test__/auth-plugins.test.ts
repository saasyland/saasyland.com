import { describe, expect, it, vi } from "vite-plus/test"

import { AUTH_PLUGINS, type AuthPluginEntry, RATE_LIMIT_EXEMPT_AUTH_PATHS } from "~/src/data/auth-plugins"
import * as AREA_AUTH_PLUGINS from "~/src/data/auth-plugins.entries"

const ENTRIES: readonly AuthPluginEntry[] = Object.values(AREA_AUTH_PLUGINS).flat()

const SAMPLE_ENTRY = {
  plugin: { id: "sample" },
  rateLimitExemptPaths: ["/sample/hook"],
} as const satisfies AuthPluginEntry

describe("auth plugin composition", () => {
  it("adds the plugin of every entry an area declares, in the order of the areas", () => {
    expect(AUTH_PLUGINS).toStrictEqual(ENTRIES.map(({ plugin }) => plugin))
  })

  it("joins the paths every area exempts from rate limiting", () => {
    expect(RATE_LIMIT_EXEMPT_AUTH_PATHS).toStrictEqual(ENTRIES.flatMap(({ rateLimitExemptPaths }) => rateLimitExemptPaths))
  })

  it("adds the plugin and the paths of an area's entry", async () => {
    vi.resetModules()
    vi.doMock("~/src/data/auth-plugins.entries", () => ({ SAMPLE_AUTH_PLUGINS: [SAMPLE_ENTRY] }))

    const plugins = await import("~/src/data/auth-plugins")

    expect(plugins.AUTH_PLUGINS).toStrictEqual([SAMPLE_ENTRY.plugin])
    expect(plugins.RATE_LIMIT_EXEMPT_AUTH_PATHS).toStrictEqual(SAMPLE_ENTRY.rateLimitExemptPaths)
    vi.doUnmock("~/src/data/auth-plugins.entries")
  })

  it("adds nothing when no area declares a plugin", async () => {
    vi.resetModules()
    vi.doMock("~/src/data/auth-plugins.entries", () => ({}))

    const plugins = await import("~/src/data/auth-plugins")

    expect(plugins.AUTH_PLUGINS).toStrictEqual([])
    expect(plugins.RATE_LIMIT_EXEMPT_AUTH_PATHS).toStrictEqual([])
    vi.doUnmock("~/src/data/auth-plugins.entries")
  })
})
