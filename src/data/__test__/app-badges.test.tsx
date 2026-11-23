import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import type { AppBadge } from "~/src/data/app-badges"
import * as AREA_APP_BADGES from "~/src/data/app-badges.entries"
import { COURSES_APP_BADGES } from "~/src/data/courses.app-badges"

import { CourseProgressBadge } from "~/src/presentation/components/custom/courses/course-progress-badge"

import * as ROUTES from "~/src/routes"

const composeWith = (areas: Readonly<Record<string, readonly AppBadge[]>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/app-badges.entries", () => areas)

  return import("~/src/data/app-badges")
}

afterEach(() => {
  vi.doUnmock("~/src/data/app-badges.entries")
})

describe("workspace navigation badges", () => {
  it("gives each menu entry at most one badge, from the area that adds it", () => {
    const areas: Readonly<Record<string, readonly AppBadge[]>> = AREA_APP_BADGES
    const routes = Object.values(areas)
      .flat()
      .map(({ to }) => to)

    expect(new Set(routes).size).toBe(routes.length)
    expect(COURSES_APP_BADGES).toStrictEqual([{ Badge: CourseProgressBadge, to: ROUTES.COURSES }])
  })

  it("finds the badge of an entry by its path and none for an entry without one", async () => {
    const badge = { Badge: () => <span />, to: ROUTES.APP_SETTINGS }
    const { appBadge } = await composeWith({ TEST_APP_BADGES: [badge] })

    expect(appBadge(ROUTES.APP_SETTINGS)).toBe(badge)
    expect(appBadge(ROUTES.APP)).toBeUndefined()
  })
})
