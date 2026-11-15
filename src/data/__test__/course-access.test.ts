import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TEST_COURSE_ACCESS } from "~/src/modules/course/__test__/fixtures/course-access"

import type { CourseAccessGrant } from "~/src/data/course-access"

const [grant] = TEST_COURSE_ACCESS

const grantingTo = (userId: string): CourseAccessGrant => ({ ...grant, holds: (learner) => Promise.resolve(learner === userId) })

const composeWith = (areas: Readonly<Record<string, readonly CourseAccessGrant[]>>) => {
  vi.resetModules()
  vi.doMock("~/src/data/course-access.entries", () => areas)

  return import("~/src/data/course-access")
}

afterEach(() => {
  vi.doUnmock("~/src/data/course-access.entries")
})

describe("course access composition", () => {
  it("joins the grants of every area and lets a learner in when any of them holds", async () => {
    const first = grantingTo("first")
    const second = grantingTo("second")
    const { COURSE_ACCESS_GRANTS, holdsCourseAccess } = await composeWith({ FIRST_COURSE_ACCESS: [first], SECOND_COURSE_ACCESS: [second] })

    expect(COURSE_ACCESS_GRANTS).toStrictEqual([first, second])
    await expect(holdsCourseAccess("first")).resolves.toBe(true)
    await expect(holdsCourseAccess("second")).resolves.toBe(true)
    await expect(holdsCourseAccess("third")).resolves.toBe(false)
  })

  it("keeps paid lessons for staff when no area grants course access", async () => {
    const { COURSE_ACCESS_GRANTS, holdsCourseAccess } = await composeWith({})

    expect(COURSE_ACCESS_GRANTS).toStrictEqual([])
    await expect(holdsCourseAccess("learner")).resolves.toBe(false)
  })
})
