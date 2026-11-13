import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation, executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { IDS, LESSON_IDS, USERS, recordProgress, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { COURSE_KIND, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import { createCourseMutation } from "~/src/modules/course/use-cases/create-course"
import { deleteCourseMutation } from "~/src/modules/course/use-cases/delete-course"
import { courseEditorQuery } from "~/src/modules/course/use-cases/get-course-editor"
import { getCoursesPageQuery } from "~/src/modules/course/use-cases/get-courses"
import { updateCourseMutation } from "~/src/modules/course/use-cases/update-course"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { video } from "~/src/modules/video/video.schema"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"

const NEW_COURSE = {
  kind: COURSE_KIND.PROJECT,
  slug: "build-a-saas",
  status: COURSE_STATUS.DRAFT,
  summary: { "en-US": "From zero." },
  title: { "en-US": "Build a SaaS", "pl-PL": "Zbuduj SaaS" },
}

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getCourses", () => {
  it("lists every course with its lesson count, drafts included", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const page = await executeQuery(getCoursesPageQuery())

    expect(page.total).toBe(3)
    expect(page.rows.map(({ id, lessons, status }) => [id, lessons, status])).toStrictEqual([
      [IDS.DRAFT_COURSE, 0, COURSE_STATUS.DRAFT],
      [IDS.COURSE, 5, COURSE_STATUS.PUBLISHED],
      [IDS.TUTORIAL, 0, COURSE_STATUS.PUBLISHED],
    ])
  })

  it("pages the list", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const page = await executeQuery(getCoursesPageQuery({ pageIndex: 1, pageSize: 2 }))

    expect(page).toMatchObject({ rows: [{ id: IDS.TUTORIAL }], total: 3 })
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeQuery(getCoursesPageQuery())).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("getCourseEditor", () => {
  it("returns the course with every chapter and lesson in order and each lesson's video", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const editor = await executeQuery(courseEditorQuery({ courseId: IDS.COURSE }))

    expect(editor.course).toMatchObject({ id: IDS.COURSE, slug: "the-walkthrough" })
    expect(editor.chapters.map(({ id, lessons }) => [id, lessons.map(({ slug }) => slug)])).toStrictEqual([
      [IDS.CHAPTER_ONE, ["boundaries", "sessions"]],
      [IDS.CHAPTER_TWO, ["billing", "coverage", "unfinished"]],
    ])
    expect(editor.chapters[1]?.lessons[0]?.video).toStrictEqual({ durationMs: 125_000, id: IDS.VIDEO, title: "Lesson" })
    expect(editor.chapters[1]?.lessons[1]?.video).toBeNull()
  })

  it("returns an empty curriculum for a course without chapters", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeQuery(courseEditorQuery({ courseId: IDS.TUTORIAL }))).resolves.toMatchObject({ chapters: [] })
  })

  it("keeps a chapter that has no lessons yet", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await db.insert(chapter).values({ courseId: IDS.TUTORIAL, id: MISSING_ID, position: 1, title: { "en-US": "Empty" } })

    const editor = await executeQuery(courseEditorQuery({ courseId: IDS.TUTORIAL }))

    expect(editor.chapters).toStrictEqual([{ id: MISSING_ID, lessons: [], position: 1, title: { "en-US": "Empty" } }])
  })

  it("rejects a missing course", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeQuery(courseEditorQuery({ courseId: MISSING_ID }))).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeQuery(courseEditorQuery({ courseId: IDS.COURSE }))).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("createCourse", () => {
  it("creates the course after the last one", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const { id } = await executeMutation(createCourseMutation, NEW_COURSE)

    const [row] = await db.select().from(course).where(eq(course.id, id))
    expect(row).toMatchObject({ ...NEW_COURSE, position: 3 })
  })

  it("refuses a slug another course uses", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(createCourseMutation, { ...NEW_COURSE, slug: "the-walkthrough" })).rejects.toThrow(ERROR_CODES.CONFLICT)
  })

  it.each([
    { input: { ...NEW_COURSE, slug: "Not a slug" }, name: "an invalid slug" },
    { input: { ...NEW_COURSE, title: { "pl-PL": "Tylko po polsku" } }, name: "a title without English" },
  ])("rejects $name", async ({ input }) => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(createCourseMutation, input)).rejects.toThrow()
    await expect(db.select().from(course)).resolves.toHaveLength(3)
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(createCourseMutation, NEW_COURSE)).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("updateCourse", () => {
  it("saves the details", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(updateCourseMutation, { ...NEW_COURSE, courseId: IDS.TUTORIAL })

    const [row] = await db.select().from(course).where(eq(course.id, IDS.TUTORIAL))
    expect(row).toMatchObject({ ...NEW_COURSE, position: 2 })
  })

  it("refuses a slug another course uses and a missing course", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(updateCourseMutation, { ...NEW_COURSE, courseId: IDS.TUTORIAL, slug: "the-walkthrough" })).rejects.toThrow(
      ERROR_CODES.CONFLICT,
    )
    await expect(executeMutation(updateCourseMutation, { ...NEW_COURSE, courseId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})

describe("deleteCourse", () => {
  it("removes the course, its curriculum and its progress but keeps the videos", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await recordProgress({ lessonId: LESSON_IDS.PAID, positionMs: 1000, userId: USERS.BUYER })

    await executeMutation(deleteCourseMutation, { courseId: IDS.COURSE })

    await expect(db.select().from(chapter)).resolves.toHaveLength(0)
    await expect(db.select().from(lesson)).resolves.toHaveLength(0)
    await expect(db.select().from(lessonProgress)).resolves.toHaveLength(0)
    await expect(db.select().from(video)).resolves.toHaveLength(1)
  })

  it("rejects a missing course", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(deleteCourseMutation, { courseId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(deleteCourseMutation, { courseId: IDS.COURSE })).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})
