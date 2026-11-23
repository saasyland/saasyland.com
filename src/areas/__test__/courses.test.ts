import { expect, it } from "vite-plus/test"

import { COURSES_BROWSER } from "~/src/areas/courses"

import * as ROUTES from "~/src/routes"

it("shows the course progress next to the workspace's Courses entry", () => {
  expect(COURSES_BROWSER.appBadges).toStrictEqual([expect.objectContaining({ to: ROUTES.COURSES })])
})
