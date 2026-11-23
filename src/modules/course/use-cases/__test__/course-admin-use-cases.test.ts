import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { asc, eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation, executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import { IDS, LESSON_IDS, USERS, recordProgress, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { createCourseMutation } from "~/src/modules/course/use-cases/create-course"
import { deleteCoursesMutation } from "~/src/modules/course/use-cases/delete-courses"
import { courseEditorQuery } from "~/src/modules/course/use-cases/get-course-editor"
import { getCoursesPageQuery } from "~/src/modules/course/use-cases/get-courses"
import { moveCourseMutation } from "~/src/modules/course/use-cases/move-course"
import { updateCourseMutation } from "~/src/modules/course/use-cases/update-course"
import { LESSON_ATTACHMENT_FILE_TYPES, LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { attachmentObjectKey } from "~/src/modules/lesson-attachment/lesson-attachment.files"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import { LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import {
  VIDEO_UPLOAD_PART_BYTES,
  VIDEO_UPLOAD_POLL_MS,
  VIDEO_UPLOAD_STATUS,
  type VIDEO_UPLOAD_STATUSES,
} from "~/src/modules/video-upload/video-upload.constants"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import { video } from "~/src/modules/video/video.schema"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"
const UPLOAD_ID = "01960000-0000-7000-8000-00000000e001"

const NEW_COURSE = {
  icon: COURSE_ICON.ROCKET,
  kind: COURSE_KIND.PROJECT,
  level: COURSE_LEVEL.INTERMEDIATE,
  outcomes: { "en-US": ["Deploy to Cloudflare", "Sell a licence"], "pl-PL": ["Wdróż na Cloudflare"] },
  prerequisites: { "en-US": ["TypeScript"] },
  slug: "build-a-saas",
  status: COURSE_STATUS.DRAFT,
  summary: { "en-US": "From zero." },
  title: { "en-US": "Build a SaaS", "pl-PL": "Zbuduj SaaS" },
}

const idsOf = async (input: Course["getCourses"]): Promise<string[]> => {
  const { rows } = await executeQuery(getCoursesPageQuery(input))
  return rows.map(({ id }) => id)
}

const courseOrder = async (): Promise<string[]> => {
  const rows = await db.select({ id: course.id }).from(course).orderBy(asc(course.position), asc(course.id))
  return rows.map(({ id }) => id)
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

  it("numbers each course by its place in the catalogue, whatever the list shows", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const page = await executeQuery(getCoursesPageQuery({ sorting: [{ desc: true, id: "lessons" }] }))

    expect(page.rows.map(({ id, position }) => [id, position])).toStrictEqual([
      [IDS.COURSE, 2],
      [IDS.DRAFT_COURSE, 1],
      [IDS.TUTORIAL, 3],
    ])
  })

  it("searches the titles in every language and the slugs, and filters by kind, status, lessons and the day it changed", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await db
      .update(course)
      .set({ updatedAt: new Date("2026-11-01T12:00:00Z") })
      .where(eq(course.id, IDS.TUTORIAL))

    await expect(idsOf({ search: "przewodnik" })).resolves.toStrictEqual([IDS.COURSE])
    await expect(idsOf({ search: "one-off" })).resolves.toStrictEqual([IDS.TUTORIAL])
    await expect(idsOf({ filters: { course: "unrel" } })).resolves.toStrictEqual([IDS.DRAFT_COURSE])
    await expect(idsOf({ filters: { kind: [COURSE_KIND.TUTORIAL] } })).resolves.toStrictEqual([IDS.TUTORIAL])
    await expect(idsOf({ pageSize: 1, sorting: [{ desc: false, id: "kind" }] })).resolves.toStrictEqual([IDS.DRAFT_COURSE])
    await expect(idsOf({ filters: { status: [COURSE_STATUS.DRAFT] } })).resolves.toStrictEqual([IDS.DRAFT_COURSE])
    await expect(idsOf({ filters: { lessons: { min: 1 } } })).resolves.toStrictEqual([IDS.COURSE])
    await expect(idsOf({ filters: { updatedAt: { to: new Date("2026-11-02T00:00:00Z").getTime() } } })).resolves.toStrictEqual([
      IDS.TUTORIAL,
    ])

    const lessonless = await executeQuery(getCoursesPageQuery({ filters: { lessons: { max: 0 } } }))

    expect(lessonless.total).toBe(2)
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
    expect(editor.chapters[1]?.lessons[0]?.video).toStrictEqual({
      captionLocales: ["en-US"],
      durationMs: 125_000,
      height: 1080,
      id: IDS.VIDEO,
      lessonCount: 4,
      sizeBytes: 1,
      title: "Lesson",
      width: 1920,
    })
    expect(editor.chapters[1]?.lessons[1]).toMatchObject({ format: LESSON_FORMAT.VIDEO, video: null })
    expect(editor.chapters[1]?.lessons[1]).not.toHaveProperty("upload")
  })

  it("returns a lesson's upload with the bytes received so far", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await db.insert(videoUpload).values({
      contentType: "video/mp4",
      fileName: "take.mp4",
      id: UPLOAD_ID,
      lastModified: 1,
      lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO,
      multipartId: "multipart",
      objectKey: `uploads/${UPLOAD_ID}/source.mp4`,
      partBytes: VIDEO_UPLOAD_PART_BYTES,
      parts: { "2": "etag" },
      sizeBytes: VIDEO_UPLOAD_PART_BYTES + 7,
    })

    const editor = await executeQuery(courseEditorQuery({ courseId: IDS.COURSE }))

    expect(editor.chapters[1]?.lessons[1]?.upload?.createdAt).toBeInstanceOf(Date)
    expect(editor.chapters[1]?.lessons[1]?.upload).toMatchObject({
      failure: null,
      fileName: "take.mp4",
      id: UPLOAD_ID,
      sizeBytes: VIDEO_UPLOAD_PART_BYTES + 7,
      status: VIDEO_UPLOAD_STATUS.UPLOADING,
      uploadedBytes: 7,
    })
  })

  it("returns each lesson's text, key moments and materials for editing", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const description = { "en-US": "Read the code.", "pl-PL": "Przeczytaj kod." }
    const keyMoments = [{ label: { "en-US": "Start" }, seconds: 3 }]
    const fileId = "01960000-0000-7000-8000-00000000d001"
    await db.update(lesson).set({ description, keyMoments }).where(eq(lesson.id, LESSON_IDS.PAID))
    await db.insert(lessonAttachment).values([
      {
        id: "01960000-0000-7000-8000-00000000d101",
        kind: LESSON_ATTACHMENT_KIND.LINK,
        lessonId: LESSON_IDS.PAID,
        position: 2,
        title: { "en-US": "Docs" },
        url: "/docs",
      },
      {
        contentType: LESSON_ATTACHMENT_FILE_TYPES.zip,
        id: fileId,
        kind: LESSON_ATTACHMENT_KIND.FILE,
        lessonId: LESSON_IDS.PAID,
        objectKey: attachmentObjectKey({ attachmentId: fileId, fileName: "starter.zip" }),
        position: 1,
        sizeBytes: 2048,
        title: { "en-US": "Starter" },
      },
    ])

    const editor = await executeQuery(courseEditorQuery({ courseId: IDS.COURSE }))

    expect(editor.chapters[1]?.lessons[0]).toMatchObject({
      attachments: [
        { fileName: "starter.zip", id: fileId, kind: LESSON_ATTACHMENT_KIND.FILE, lessonId: LESSON_IDS.PAID, position: 1, sizeBytes: 2048 },
        { kind: LESSON_ATTACHMENT_KIND.LINK, position: 2, title: { "en-US": "Docs" }, url: "/docs" },
      ],
      description,
      keyMoments,
    })
    expect(editor.chapters[0]?.lessons[0]?.attachments).toStrictEqual([])
  })

  it("returns an empty curriculum for a course without chapters", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeQuery(courseEditorQuery({ courseId: IDS.TUTORIAL }))).resolves.toMatchObject({ chapters: [] })
  })

  it("keeps a chapter that has no lessons yet", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await db
      .insert(chapter)
      .values({ courseId: IDS.TUTORIAL, id: MISSING_ID, position: 1, summary: { "en-US": "Soon." }, title: { "en-US": "Empty" } })

    const editor = await executeQuery(courseEditorQuery({ courseId: IDS.TUTORIAL }))

    expect(editor.chapters).toStrictEqual([
      { id: MISSING_ID, lessons: [], position: 1, summary: { "en-US": "Soon." }, title: { "en-US": "Empty" } },
    ])
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
    { input: { ...NEW_COURSE, outcomes: { "en-US": [" "] } }, name: "an empty outcome" },
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

describe("deleteCourses", () => {
  it("removes each course, its curriculum and its progress but keeps the videos", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await recordProgress({ lessonId: LESSON_IDS.PAID, positionMs: 1000, userId: USERS.ENTITLED })

    await expect(executeMutation(deleteCoursesMutation, { courseIds: [IDS.COURSE, IDS.TUTORIAL, MISSING_ID] })).resolves.toStrictEqual({
      ids: [IDS.COURSE, IDS.TUTORIAL],
    })

    await expect(courseOrder()).resolves.toStrictEqual([IDS.DRAFT_COURSE])
    await expect(db.select().from(chapter)).resolves.toHaveLength(0)
    await expect(db.select().from(lesson)).resolves.toHaveLength(0)
    await expect(db.select().from(lessonProgress)).resolves.toHaveLength(0)
    await expect(db.select().from(video)).resolves.toHaveLength(2)
  })

  it("rejects a list without a course it can find, and an empty list", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(deleteCoursesMutation, { courseIds: [MISSING_ID] })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    await expect(executeMutation(deleteCoursesMutation, { courseIds: [] })).rejects.toThrow()
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(deleteCoursesMutation, { courseIds: [IDS.COURSE] })).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("moveCourse", () => {
  it("moves the course to any place in the catalogue order", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(moveCourseMutation, { courseId: IDS.TUTORIAL, position: 1 })
    await expect(courseOrder()).resolves.toStrictEqual([IDS.TUTORIAL, IDS.DRAFT_COURSE, IDS.COURSE])

    await executeMutation(moveCourseMutation, { courseId: IDS.TUTORIAL, position: 2 })
    await expect(courseOrder()).resolves.toStrictEqual([IDS.DRAFT_COURSE, IDS.TUTORIAL, IDS.COURSE])
  })

  it("keeps a place past the end at the end, and leaves a course already in its place alone", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(moveCourseMutation, { courseId: IDS.DRAFT_COURSE, position: 40 })
    await expect(courseOrder()).resolves.toStrictEqual([IDS.COURSE, IDS.TUTORIAL, IDS.DRAFT_COURSE])

    await executeMutation(moveCourseMutation, { courseId: IDS.DRAFT_COURSE, position: 3 })
    await expect(courseOrder()).resolves.toStrictEqual([IDS.COURSE, IDS.TUTORIAL, IDS.DRAFT_COURSE])
  })

  it("rejects a missing course and a place before the first", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(moveCourseMutation, { courseId: MISSING_ID, position: 1 })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    await expect(executeMutation(moveCourseMutation, { courseId: IDS.COURSE, position: 0 })).rejects.toThrow()
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(moveCourseMutation, { courseId: IDS.COURSE, position: 1 })).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

const pollingOf = async (status: (typeof VIDEO_UPLOAD_STATUSES)[number] | undefined) => {
  await db.delete(videoUpload)
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const options = courseEditorQuery({ courseId: IDS.COURSE })
  if (status !== undefined) {
    await db.insert(videoUpload).values({
      contentType: "video/mp4",
      fileName: "take.mp4",
      id: UPLOAD_ID,
      lastModified: 1,
      lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO,
      multipartId: "multipart",
      objectKey: `uploads/${UPLOAD_ID}/source.mp4`,
      partBytes: VIDEO_UPLOAD_PART_BYTES,
      sizeBytes: 1,
      status,
    })
    await queryClient.query(options)
  }
  const query = new QueryObserver(queryClient, options).getCurrentQuery()

  const { refetchInterval } = options
  if (typeof refetchInterval !== "function") {
    throw new TypeError("courseEditorQuery polls with a function of the query")
  }

  return refetchInterval(query)
}

describe("courseEditorQuery", () => {
  it("polls the editor while an upload waits for the encoder or is being encoded, and only then", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(pollingOf(VIDEO_UPLOAD_STATUS.QUEUED)).resolves.toBe(VIDEO_UPLOAD_POLL_MS)
    await expect(pollingOf(VIDEO_UPLOAD_STATUS.ENCODING)).resolves.toBe(VIDEO_UPLOAD_POLL_MS)
    await expect(pollingOf(VIDEO_UPLOAD_STATUS.FAILED)).resolves.toBe(false)
    await expect(pollingOf(undefined)).resolves.toBe(false)
  })
})
