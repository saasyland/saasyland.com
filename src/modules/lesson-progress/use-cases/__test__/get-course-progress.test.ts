import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { IDS, LESSON_IDS, USERS, recordProgress, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { course } from "~/src/modules/course/course.schema"
import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"

const COMPLETED_AT = new Date("2026-11-18T10:00:00.000Z")
const PUBLISHED_LESSONS = [LESSON_IDS.PREVIEW, LESSON_IDS.ACCOUNT, LESSON_IDS.PAID, LESSON_IDS.PAID_WITHOUT_VIDEO]

beforeEach(async () => {
  await seedCatalogue()
  for (const lessonId of [...PUBLISHED_LESSONS, LESSON_IDS.DRAFT]) {
    await recordProgress({ completedAt: COMPLETED_AT, lessonId, positionMs: 0, userId: USERS.ENTITLED })
  }
  await recordProgress({ lessonId: LESSON_IDS.PREVIEW, positionMs: 30_000, userId: USERS.VISITOR })
  await recordProgress({ completedAt: COMPLETED_AT, lessonId: LESSON_IDS.ACCOUNT, positionMs: 0, userId: USERS.VISITOR })
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.ADMIN }))
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("get-course-progress", () => {
  it("counts each course's published lessons, its learners, those who finished it and the lessons they completed", async () => {
    const { learners, rows } = await executeQuery(courseProgressQuery)

    expect(learners).toBe(2)
    expect(
      rows.map(({ completedLessons, finished, id, learners: started, lessons }) => ({
        completedLessons,
        finished,
        id,
        learners: started,
        lessons,
      })),
    ).toStrictEqual([
      { completedLessons: 0, finished: 0, id: IDS.DRAFT_COURSE, learners: 0, lessons: 0 },
      { completedLessons: 5, finished: 1, id: IDS.COURSE, learners: 2, lessons: 4 },
      { completedLessons: 0, finished: 0, id: IDS.TUTORIAL, learners: 0, lessons: 0 },
    ])
    expect(rows[1]?.title).toStrictEqual({ "en-US": "The walkthrough", "pl-PL": "Przewodnik" })
  })

  it("answers no courses and no learners before any course exists", async () => {
    await db.delete(course)

    await expect(executeQuery(courseProgressQuery)).resolves.toStrictEqual({ learners: 0, rows: [] })
  })

  it("rejects a caller without the permission to read courses", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER }))

    await expect(executeQuery(courseProgressQuery)).rejects.toMatchObject({ code: ERROR_CODES.FORBIDDEN })
  })

  it("rejects a signed-out caller", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null)

    await expect(executeQuery(courseProgressQuery)).rejects.toMatchObject({ code: ERROR_CODES.UNAUTHORIZED })
  })
})
