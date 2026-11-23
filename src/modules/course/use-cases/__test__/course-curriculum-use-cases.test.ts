import { asc, eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { IDS, LESSON_IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import type { Course } from "~/src/modules/course/course.types"
import { reorderCurriculumMutation } from "~/src/modules/course/use-cases/reorder-curriculum"
import { lesson } from "~/src/modules/lesson/lesson.schema"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"

const FIRST = { chapterId: IDS.CHAPTER_ONE, lessonIds: [LESSON_IDS.PREVIEW, LESSON_IDS.ACCOUNT] }

const SECOND = { chapterId: IDS.CHAPTER_TWO, lessonIds: [LESSON_IDS.PAID, LESSON_IDS.PAID_WITHOUT_VIDEO, LESSON_IDS.DRAFT] }

const CURRENT = [FIRST, SECOND]

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

const reorder = (chapters: Course["reorderCurriculum"]["chapters"], courseId: string = IDS.COURSE) =>
  executeMutation(reorderCurriculumMutation, { chapters, courseId })

const storedOrder = async () => {
  const [chapters, lessons] = await Promise.all([
    db.select({ id: chapter.id }).from(chapter).where(eq(chapter.courseId, IDS.COURSE)).orderBy(asc(chapter.position)),
    db
      .select({ chapterId: lesson.chapterId, id: lesson.id })
      .from(lesson)
      .where(eq(lesson.courseId, IDS.COURSE))
      .orderBy(asc(lesson.position)),
  ])

  return chapters.map(({ id }) => ({
    chapterId: id,
    lessonIds: lessons.filter((entry) => entry.chapterId === id).map((entry) => entry.id),
  }))
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("reorderCurriculum", () => {
  it("moves a lesson into another chapter and renumbers both chapters", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const order = [
      { chapterId: IDS.CHAPTER_ONE, lessonIds: [LESSON_IDS.PREVIEW, LESSON_IDS.PAID, LESSON_IDS.ACCOUNT] },
      { chapterId: IDS.CHAPTER_TWO, lessonIds: [LESSON_IDS.PAID_WITHOUT_VIDEO, LESSON_IDS.DRAFT] },
    ]

    await expect(reorder(order)).resolves.toStrictEqual({ courseId: IDS.COURSE, moved: 4 })

    await expect(storedOrder()).resolves.toStrictEqual(order)
  })

  it("moves a chapter with its lessons and writes only what changed", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const order = [SECOND, FIRST]

    await expect(reorder(order)).resolves.toStrictEqual({ courseId: IDS.COURSE, moved: 2 })
    await expect(storedOrder()).resolves.toStrictEqual(order)
    await expect(reorder(order)).resolves.toStrictEqual({ courseId: IDS.COURSE, moved: 0 })
  })

  it.each([
    { chapters: [FIRST], name: "a chapter that is left out" },
    { chapters: [{ ...FIRST, lessonIds: [LESSON_IDS.PREVIEW] }, SECOND], name: "a lesson that is left out" },
    { chapters: [FIRST, { ...SECOND, lessonIds: [LESSON_IDS.PAID, LESSON_IDS.PAID, LESSON_IDS.DRAFT] }], name: "a lesson named twice" },
    {
      chapters: [FIRST, { ...SECOND, lessonIds: [LESSON_IDS.PAID, LESSON_IDS.PAID_WITHOUT_VIDEO, MISSING_ID] }],
      name: "a lesson of another course",
    },
  ])("refuses an order with $name, which means the curriculum changed elsewhere", async ({ chapters }) => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(reorder(chapters)).rejects.toThrow(ERROR_CODES.CONFLICT)
    await expect(storedOrder()).resolves.toStrictEqual(CURRENT)
  })

  it("rejects a course without a curriculum", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(reorder(CURRENT, MISSING_ID)).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(reorder(CURRENT)).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})
