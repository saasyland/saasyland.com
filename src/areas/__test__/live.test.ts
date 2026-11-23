import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { CORE_LIVE_CHECKS } from "~/src/areas/core.live"
import * as AREA_LIVE_CHECKS from "~/src/areas/live.entries"
import type { LiveSiteCheck } from "~/src/data/live.constants"

afterEach(() => {
  vi.doUnmock("~/src/areas/live.entries")
})

describe("live site check composition", () => {
  it("checks the requests of every area once", async () => {
    const { LIVE_SITE_CHECKS } = await import("~/src/lib/deployment")
    const declared: readonly LiveSiteCheck[] = Object.values(AREA_LIVE_CHECKS).flat()

    expect(LIVE_SITE_CHECKS).toStrictEqual(declared)
    expect(new Set(declared.map(({ path, post }) => [path, post?.name].join(" "))).size).toBe(declared.length)
  })

  it("checks only the core paths of a project without other areas", async () => {
    vi.resetModules()
    vi.doMock("~/src/areas/live.entries", () => ({ CORE_LIVE_CHECKS }))

    const { LIVE_SITE_CHECKS } = await import("~/src/lib/deployment")

    expect(LIVE_SITE_CHECKS).toStrictEqual(CORE_LIVE_CHECKS)
  })
})
