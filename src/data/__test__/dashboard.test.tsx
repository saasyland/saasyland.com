import { describe, expect, it, vi } from "vite-plus/test"

import { ADMIN_DASHBOARD_PANELS, ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"
import {
  type AdminDashboardEntry,
  type AdminDashboardPanel,
  type AdminDashboardStat,
  DASHBOARD_PLACEMENT,
} from "~/src/data/dashboard.constants"
import * as AREA_DASHBOARD from "~/src/data/dashboard.entries"

const SAMPLE_AREA = "sample"

const stat = (key: string, order: number): AdminDashboardStat => ({
  area: SAMPLE_AREA,
  key,
  order,
  placement: DASHBOARD_PLACEMENT.STAT,
  prefetch: () => Promise.resolve(),
  useValue: () => order,
})

const panel = (key: string, order: number): AdminDashboardPanel => ({
  Panel: () => <span />,
  Pending: () => <span />,
  area: SAMPLE_AREA,
  key,
  order,
  placement: DASHBOARD_PLACEMENT.PANEL,
})

const keys = (list: readonly AdminDashboardEntry[]): string[] => list.map(({ area, key }) => `${area}:${key}`).toSorted()

describe("admin dashboard composition", () => {
  it("places every entry an area adds once, the stats apart from the panels", () => {
    const entries: readonly AdminDashboardEntry[] = Object.values(AREA_DASHBOARD).flat()

    expect(keys(ADMIN_DASHBOARD_STATS)).toStrictEqual(keys(entries.filter(({ placement }) => placement === DASHBOARD_PLACEMENT.STAT)))
    expect(keys(ADMIN_DASHBOARD_PANELS)).toStrictEqual(keys(entries.filter(({ placement }) => placement === DASHBOARD_PLACEMENT.PANEL)))
  })

  it("loads each panel's component on demand, which the dashboard's loader preloads", async () => {
    const preloads = ADMIN_DASHBOARD_PANELS.map(({ Panel }) => Panel.preload)

    expect(preloads.every((preload) => typeof preload === "function")).toBe(true)
    await expect(
      Promise.all(
        preloads.map(async (preload) => {
          await preload?.()
        }),
      ),
    ).resolves.toHaveLength(ADMIN_DASHBOARD_PANELS.length)
  })

  it("orders the stats and the panels of every area", async () => {
    const first = stat("first", 20)
    const second = panel("second", 20)
    const third = stat("third", 10)
    const fourth = panel("fourth", 10)

    vi.resetModules()
    vi.doMock("~/src/data/dashboard.entries", () => ({ FIRST_DASHBOARD: [first, second], SECOND_DASHBOARD: [third, fourth] }))

    const dashboard = await import("~/src/data/dashboard")

    expect(dashboard.ADMIN_DASHBOARD_STATS).toStrictEqual([third, first])
    expect(dashboard.ADMIN_DASHBOARD_PANELS).toStrictEqual([fourth, second])
    vi.doUnmock("~/src/data/dashboard.entries")
  })
})
