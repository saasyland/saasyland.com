import { asc, eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { MOVE_DIRECTION } from "~/src/modules/_core/constants/ordering"
import { IDS, LESSON_IDS, USERS, recordProgress, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { createLessonMutation } from "~/src/modules/lesson/use-cases/create-lesson"
import { deleteLessonMutation } from "~/src/modules/lesson/use-cases/delete-lesson"
import { moveLessonMutation } from "~/src/modules/lesson/use-cases/move-lesson"
import { updateLessonMutation } from "~/src/modules/lesson/use-cases/update-lesson"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"

const FIELDS = {
  access: LESSON_ACCESS.ACCOUNT,
  slug: "webhooks",
  status: LESSON_STATUS.PUBLISHED,
  summary: { "en-US": "Webhooks." },
  title: { "en-US": "Webhooks", "pl-PL": "Webhooki" },
}

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

const lessonRow = async (lessonId: string) => {
  const [row] = await db.select().from(lesson).where(eq(lesson.id, lessonId))
  return row
}

const lessonOrder = async (chapterId: string): Promise<string[]> => {
  const rows = await db.select({ id: lesson.id }).from(lesson).where(eq(lesson.chapterId, chapterId)).orderBy(asc(lesson.position))
  return rows.map(({ id }) => id)
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("createLesson", () => {
  it("adds the lesson at the end of its chapter, in the chapter's course", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const { id } = await executeMutation(createLessonMutation, { ...FIELDS, chapterId: IDS.CHAPTER_ONE, videoId: IDS.VIDEO })

    await expect(lessonRow(id)).resolves.toMatchObject({
      ...FIELDS,
      chapterId: IDS.CHAPTER_ONE,
      courseId: IDS.COURSE,
      position: 3,
      videoId: IDS.VIDEO,
    })
  })

  it("creates a lesson without a video", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const { id } = await executeMutation(createLessonMutation, { ...FIELDS, chapterId: IDS.CHAPTER_TWO })

    await expect(lessonRow(id)).resolves.toMatchObject({ position: 4, videoId: null })
  })

  it("refuses a slug another lesson of the course uses", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(createLessonMutation, { ...FIELDS, chapterId: IDS.CHAPTER_ONE, slug: "billing" })).rejects.toThrow(
      ERROR_CODES.CONFLICT,
    )
  })

  it("rejects a missing chapter", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(createLessonMutation, { ...FIELDS, chapterId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(createLessonMutation, { ...FIELDS, chapterId: IDS.CHAPTER_ONE })).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("updateLesson", () => {
  it("saves the fields and detaches the video when none is chosen", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(updateLessonMutation, { ...FIELDS, lessonId: LESSON_IDS.PAID })

    await expect(lessonRow(LESSON_IDS.PAID)).resolves.toMatchObject({ ...FIELDS, videoId: null })
  })

  it("attaches a video", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(updateLessonMutation, { ...FIELDS, lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO, videoId: IDS.VIDEO })

    await expect(lessonRow(LESSON_IDS.PAID_WITHOUT_VIDEO)).resolves.toMatchObject({ videoId: IDS.VIDEO })
  })

  it("refuses a slug another lesson of the course uses", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(updateLessonMutation, { ...FIELDS, lessonId: LESSON_IDS.PAID, slug: "sessions" })).rejects.toThrow(
      ERROR_CODES.CONFLICT,
    )
  })

  it("rejects a missing lesson", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(updateLessonMutation, { ...FIELDS, lessonId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})

describe("deleteLesson", () => {
  it("removes the lesson and the progress in it", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await recordProgress({ lessonId: LESSON_IDS.ACCOUNT, positionMs: 1000, userId: USERS.BUYER })

    await executeMutation(deleteLessonMutation, { lessonId: LESSON_IDS.ACCOUNT })

    await expect(lessonOrder(IDS.CHAPTER_ONE)).resolves.toStrictEqual([LESSON_IDS.PREVIEW])
    await expect(db.select().from(lessonProgress)).resolves.toHaveLength(0)
  })

  it("rejects a missing lesson", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(deleteLessonMutation, { lessonId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})

describe("moveLesson", () => {
  it("swaps the lesson with its neighbour inside the chapter", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(moveLessonMutation, { direction: MOVE_DIRECTION.DOWN, lessonId: LESSON_IDS.PAID })

    await expect(lessonOrder(IDS.CHAPTER_TWO)).resolves.toStrictEqual([LESSON_IDS.PAID_WITHOUT_VIDEO, LESSON_IDS.PAID, LESSON_IDS.DRAFT])
  })

  it("leaves the order alone at the end of the chapter", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(moveLessonMutation, { direction: MOVE_DIRECTION.DOWN, lessonId: LESSON_IDS.DRAFT })

    await expect(lessonOrder(IDS.CHAPTER_TWO)).resolves.toStrictEqual([LESSON_IDS.PAID, LESSON_IDS.PAID_WITHOUT_VIDEO, LESSON_IDS.DRAFT])
  })

  it("rejects a missing lesson", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(moveLessonMutation, { direction: MOVE_DIRECTION.UP, lessonId: MISSING_ID })).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )
  })
})
