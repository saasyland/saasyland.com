import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { IDS, LESSON_IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import {
  COURSE_DOCUMENT,
  COURSE_DOCUMENT_MAX_LENGTH,
  COURSE_ICON,
  COURSE_IMPORTS_PER_MINUTE,
  COURSE_IMPORT_PROBLEMS_MAX,
  COURSE_KIND,
  COURSE_LEVEL,
  COURSE_STATUS,
} from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { exportCoursesMutation } from "~/src/modules/course/use-cases/export-courses"
import { importCoursesMutation } from "~/src/modules/course/use-cases/import-courses"
import { LESSON_ATTACHMENT_FILE_TYPES, LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"
const KEY_MOMENT_SECONDS = 135

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

const exportCourses = (input: Course["exportCourses"] = {}) => executeMutation(exportCoursesMutation, input)

const check = (document: string) => executeMutation(importCoursesMutation, { document, dryRun: true, removeMissing: false })

const documentOf = (courses: unknown[], header: Record<string, unknown> = {}): string =>
  JSON.stringify({ courses, format: COURSE_DOCUMENT.FORMAT, version: COURSE_DOCUMENT.VERSION, ...header })

const LESSON = {
  access: LESSON_ACCESS.PAID,
  description: {},
  keyMoments: [],
  links: [],
  slug: "first",
  status: LESSON_STATUS.DRAFT,
  summary: { "en-US": "First." },
  title: { "en-US": "First" },
}

const COURSE = {
  chapters: [{ lessons: [LESSON], summary: {}, title: { "en-US": "Start" } }],
  icon: COURSE_ICON.ROCKET,
  kind: COURSE_KIND.COURSE,
  level: COURSE_LEVEL.BEGINNER,
  outcomes: {},
  prerequisites: {},
  slug: "new-course",
  status: COURSE_STATUS.DRAFT,
  summary: { "en-US": "New." },
  title: { "en-US": "New course" },
}

const problemsOf = async (document: string) => {
  const result = await check(document)
  if (!("problems" in result)) {
    throw new Error("The document passed the check")
  }

  return result
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("exportCourses", () => {
  it("writes every course with its chapters, lessons, key moments, links and video, and leaves uploaded files out", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await db
      .update(lesson)
      .set({ description: { "en-US": "Read me." }, keyMoments: [{ label: { "en-US": "Setup" }, seconds: KEY_MOMENT_SECONDS }] })
      .where(eq(lesson.id, LESSON_IDS.ACCOUNT))
    await db.insert(lessonAttachment).values([
      {
        id: "attachment-link",
        kind: LESSON_ATTACHMENT_KIND.LINK,
        lessonId: LESSON_IDS.PREVIEW,
        position: 2,
        title: { "en-US": "Docs" },
        url: "/docs/features/courses",
      },
      {
        contentType: LESSON_ATTACHMENT_FILE_TYPES.pdf,
        id: "attachment-file",
        kind: LESSON_ATTACHMENT_KIND.FILE,
        lessonId: LESSON_IDS.PREVIEW,
        objectKey: "attachments/attachment-file/slides.pdf",
        position: 1,
        sizeBytes: 1,
        title: { "en-US": "Slides" },
      },
    ])

    const document = await exportCourses()

    expect(document.format).toBe(COURSE_DOCUMENT.FORMAT)
    expect(document.version).toBe(COURSE_DOCUMENT.VERSION)
    expect(document.courses.map(({ slug }) => slug)).toStrictEqual(["unreleased", "the-walkthrough", "one-off"])
    const [, walkthrough] = document.courses
    expect(walkthrough?.chapters.map(({ title }) => title)).toStrictEqual([
      { "en-US": "First", "pl-PL": "Pierwszy" },
      { "en-US": "Second" },
    ])
    expect(walkthrough?.chapters[1]?.lessons.map(({ slug }) => slug)).toStrictEqual(["billing", "coverage", "unfinished"])
    expect(walkthrough?.chapters[0]?.lessons[0]).toStrictEqual({
      access: LESSON_ACCESS.PREVIEW,
      description: {},
      keyMoments: [],
      links: [{ title: { "en-US": "Docs" }, url: "/docs/features/courses" }],
      slug: "boundaries",
      status: LESSON_STATUS.PUBLISHED,
      summary: { "en-US": "Start here." },
      title: { "en-US": "Boundaries", "pl-PL": "Granice" },
      videoId: IDS.VIDEO,
    })
    expect(walkthrough?.chapters[0]?.lessons[1]).toMatchObject({
      description: { "en-US": "Read me." },
      keyMoments: [{ at: "2:15", label: { "en-US": "Setup" } }],
    })
    expect(walkthrough?.chapters[1]?.lessons[1]).not.toHaveProperty("videoId")
  })

  it("writes one course on its own", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const document = await exportCourses({ courseId: IDS.TUTORIAL })

    expect(document.courses).toStrictEqual([
      {
        chapters: [],
        icon: COURSE_ICON.BOOK_OPEN,
        kind: COURSE_KIND.TUTORIAL,
        level: COURSE_LEVEL.BEGINNER,
        outcomes: {},
        prerequisites: {},
        slug: "one-off",
        status: COURSE_STATUS.PUBLISHED,
        summary: { "en-US": "A short one." },
        title: { "en-US": "One-off tutorial" },
      },
    ])
  })

  it("reports a course that does not exist", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(exportCourses({ courseId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("is for staff who may read courses", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(exportCourses()).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("importCourses checks the file", () => {
  it("reads a file that is not JSON as one problem", async () => {
    signInAs(ROLE_CODES.ADMIN)

    expect(await check("{ not json")).toStrictEqual({ problemCount: 1, problems: [{ message: "documentInvalid", path: "" }] })
  })

  it("names the format and version it reads", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const result = await problemsOf(documentOf([], { format: "lessons", version: 2 }))

    expect(result.problems).toStrictEqual([
      { message: "documentFormat", path: "format" },
      { message: "documentVersion", path: "version" },
    ])
  })

  it("points at each field that breaks a rule, with the module's own messages", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const lessons = [
      { ...LESSON, keyMoments: [{ at: "soon", label: { "en-US": "Setup" } }], titel: "typo" },
      { ...LESSON, slug: "Bad Slug" },
    ]

    const result = await problemsOf(documentOf([{ ...COURSE, chapters: [{ lessons, summary: {}, title: {} }] }]))

    expect(result.problems).toStrictEqual([
      { message: "defaultLocaleRequired", path: "courses.0.chapters.0.title.en-US" },
      { message: "timeInvalid", path: "courses.0.chapters.0.lessons.0.keyMoments.0.at" },
      { message: "keyUnknown", path: "courses.0.chapters.0.lessons.0.titel" },
      { message: "slugInvalid", path: "courses.0.chapters.0.lessons.1.slug" },
    ])
  })

  it("refuses a slug used twice for courses, or for lessons in one course", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const twoChapters = { ...COURSE, chapters: [...COURSE.chapters, ...COURSE.chapters] }

    const result = await problemsOf(documentOf([twoChapters, COURSE]))

    expect(result.problems).toStrictEqual([
      { message: "slugDuplicate", path: "courses.1.slug" },
      { message: "slugDuplicate", path: "courses.0.chapters.1.lessons.0.slug" },
    ])
  })

  it("lists the first problems and counts the rest", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const broken = Array.from({ length: COURSE_IMPORT_PROBLEMS_MAX + 1 }, (_, index) => ({
      ...COURSE,
      slug: `Not a slug ${String(index)}`,
    }))

    const result = await problemsOf(documentOf(broken))

    expect(result.problems).toHaveLength(COURSE_IMPORT_PROBLEMS_MAX)
    expect(result.problemCount).toBe(COURSE_IMPORT_PROBLEMS_MAX + 1)
  })

  it("refuses an empty or oversized file before reading it", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(check("")).rejects.toThrow(ERROR_CODES.VALIDATION)
    await expect(check(" ".repeat(COURSE_DOCUMENT_MAX_LENGTH + 1))).rejects.toThrow(ERROR_CODES.VALIDATION)
  })

  it("is for staff who may create, update and delete courses", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(check(documentOf([]))).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })

  it("limits how often one address imports", async () => {
    signInAs(ROLE_CODES.ADMIN)
    for (let count = 0; count < COURSE_IMPORTS_PER_MINUTE; count++) {
      await check(documentOf([]))
    }

    await expect(check(documentOf([]))).rejects.toThrow(ERROR_CODES.TOO_MANY_REQUESTS)
  })
})
