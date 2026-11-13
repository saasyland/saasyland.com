import { asc, eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { MOVE_DIRECTION } from "~/src/modules/_core/constants/ordering"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { createChapterMutation } from "~/src/modules/chapter/use-cases/create-chapter"
import { deleteChapterMutation } from "~/src/modules/chapter/use-cases/delete-chapter"
import { moveChapterMutation } from "~/src/modules/chapter/use-cases/move-chapter"
import { updateChapterMutation } from "~/src/modules/chapter/use-cases/update-chapter"
import { IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { lesson } from "~/src/modules/lesson/lesson.schema"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"
const TITLE = { "en-US": "Third", "pl-PL": "Trzeci" }

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

const chapterOrder = async (courseId: string): Promise<string[]> => {
  const rows = await db.select({ id: chapter.id }).from(chapter).where(eq(chapter.courseId, courseId)).orderBy(asc(chapter.position))
  return rows.map(({ id }) => id)
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("createChapter", () => {
  it("adds the chapter after the course's last one", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const { id } = await executeMutation(createChapterMutation, { courseId: IDS.COURSE, title: TITLE })

    await expect(chapterOrder(IDS.COURSE)).resolves.toStrictEqual([IDS.CHAPTER_ONE, IDS.CHAPTER_TWO, id])
  })

  it("starts a course's curriculum at the first position", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const { id } = await executeMutation(createChapterMutation, { courseId: IDS.TUTORIAL, title: TITLE })

    await expect(db.select({ position: chapter.position }).from(chapter).where(eq(chapter.id, id))).resolves.toStrictEqual([
      { position: 1 },
    ])
  })

  it("rejects a missing course", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(createChapterMutation, { courseId: MISSING_ID, title: TITLE })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(createChapterMutation, { courseId: IDS.COURSE, title: TITLE })).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("updateChapter", () => {
  it("renames the chapter", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(updateChapterMutation, { chapterId: IDS.CHAPTER_TWO, title: TITLE })

    await expect(db.select({ title: chapter.title }).from(chapter).where(eq(chapter.id, IDS.CHAPTER_TWO))).resolves.toStrictEqual([
      { title: TITLE },
    ])
  })

  it("rejects a missing chapter", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(updateChapterMutation, { chapterId: MISSING_ID, title: TITLE })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})

describe("deleteChapter", () => {
  it("removes the chapter with its lessons", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(deleteChapterMutation, { chapterId: IDS.CHAPTER_ONE })

    await expect(chapterOrder(IDS.COURSE)).resolves.toStrictEqual([IDS.CHAPTER_TWO])
    await expect(db.select().from(lesson).where(eq(lesson.chapterId, IDS.CHAPTER_ONE))).resolves.toHaveLength(0)
  })

  it("rejects a missing chapter", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(deleteChapterMutation, { chapterId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})

describe("moveChapter", () => {
  it.each([
    { chapterId: IDS.CHAPTER_TWO, direction: MOVE_DIRECTION.UP },
    { chapterId: IDS.CHAPTER_ONE, direction: MOVE_DIRECTION.DOWN },
  ])("swaps the chapter with its neighbour when moved $direction", async ({ chapterId, direction }) => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(moveChapterMutation, { chapterId, direction })

    await expect(chapterOrder(IDS.COURSE)).resolves.toStrictEqual([IDS.CHAPTER_TWO, IDS.CHAPTER_ONE])
  })

  it("leaves the order alone at either end", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(moveChapterMutation, { chapterId: IDS.CHAPTER_ONE, direction: MOVE_DIRECTION.UP })

    await expect(chapterOrder(IDS.COURSE)).resolves.toStrictEqual([IDS.CHAPTER_ONE, IDS.CHAPTER_TWO])
  })

  it("rejects a missing chapter", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(moveChapterMutation, { chapterId: MISSING_ID, direction: MOVE_DIRECTION.UP })).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )
  })
})
