import { Hash } from "lucide-react"
import { describe, expect, it, vi } from "vite-plus/test"

import { BROWSER_AREAS } from "~/src/areas/browser"
import { ADMIN_DASHBOARD_PANELS, ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"
import { type AdminDashboardPanel, type AdminDashboardStat, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

const stat = (key: string, order: number): AdminDashboardStat => ({
  icon: Hash,
  key,
  order,
  placement: DASHBOARD_PLACEMENT.STAT,
  prefetch: () => Promise.resolve(),
  useValue: () => order,
})

const panel = (key: string, order: number): AdminDashboardPanel => ({
  Panel: () => <span />,
  Pending: () => <span />,
  key,
  order,
  placement: DASHBOARD_PLACEMENT.PANEL,
})

const keys = (list: readonly { readonly area: string; readonly key: string }[]): string[] =>
  list.map(({ area, key }) => `${area}:${key}`).toSorted()

describe("admin dashboard composition", () => {
  it("places every entry an area adds once, under the area's name, the stats apart from the panels", () => {
    const entries = BROWSER_AREAS.flatMap(({ dashboard = [], name }) => dashboard.map((entry) => ({ ...entry, area: name })))

    expect(keys(ADMIN_DASHBOARD_STATS)).toStrictEqual(keys(entries.filter(({ placement }) => placement === DASHBOARD_PLACEMENT.STAT)))
    expect(keys(ADMIN_DASHBOARD_PANELS)).toStrictEqual(keys(entries.filter(({ placement }) => placement === DASHBOARD_PLACEMENT.PANEL)))
    expect(new Set(keys(entries)).size).toBe(entries.length)
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
    vi.doMock("~/src/areas/browser.entries", () => ({
      FIRST_BROWSER: { dashboard: [first, second], name: "first" },
      SECOND_BROWSER: { dashboard: [third, fourth], name: "second" },
    }))

    const dashboard = await import("~/src/data/dashboard")

    expect(dashboard.ADMIN_DASHBOARD_STATS).toStrictEqual([
      { ...third, area: "second" },
      { ...first, area: "first" },
    ])
    expect(dashboard.ADMIN_DASHBOARD_PANELS).toStrictEqual([
      { ...fourth, area: "second" },
      { ...second, area: "first" },
    ])
    vi.doUnmock("~/src/areas/browser.entries")
  })
})
