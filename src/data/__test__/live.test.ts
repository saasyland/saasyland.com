import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { CORE_LIVE_CHECKS } from "~/src/data/core.live"
import type { LiveSiteCheck } from "~/src/data/live.constants"
import * as AREA_LIVE_CHECKS from "~/src/data/live.entries"

afterEach(() => {
  vi.doUnmock("~/src/data/live.entries")
})

describe("live site check composition", () => {
  it("checks the paths of every area once", async () => {
    const { LIVE_SITE_CHECKS } = await import("~/src/data/live")
    const declared: readonly LiveSiteCheck[] = Object.values(AREA_LIVE_CHECKS).flat()

    expect(LIVE_SITE_CHECKS).toStrictEqual(declared)
    expect(new Set(declared.map(({ path }) => path)).size).toBe(declared.length)
  })

  it("checks only the core paths of a project without other areas", async () => {
    vi.resetModules()
    vi.doMock("~/src/data/live.entries", () => ({ CORE_LIVE_CHECKS }))

    const { LIVE_SITE_CHECKS } = await import("~/src/data/live")

    expect(LIVE_SITE_CHECKS).toStrictEqual(CORE_LIVE_CHECKS)
  })
})
