import { env } from "cloudflare:workers"

import { asc, eq, isNull } from "drizzle-orm"
import { readFileSync } from "node:fs"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { chapter } from "~/src/modules/chapter/chapter.schema"
import { IDS, LESSON_IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import type { Course } from "~/src/modules/course/course.types"
import { exportCoursesMutation } from "~/src/modules/course/use-cases/export-courses"
import { importCoursesMutation } from "~/src/modules/course/use-cases/import-courses"
import { LESSON_ATTACHMENT_FILE_TYPES, LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import { LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"

const CURRICULUM = readFileSync("content/courses/saasy-land-courses.json", "utf8")
const MISSING_ID = "01960000-0000-7000-8000-00000000dead"
const OBJECT_KEY = "attachments/attachment-file/notes.pdf"

type Document = Course["courseDocument"]

type Tally = Extract<Course["importResult"], { tallies: unknown }>["tallies"]["courses"]

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

const tally = (counts: Partial<Tally>): Tally => ({ create: 0, keep: 0, remove: 0, unchanged: 0, update: 0, ...counts })

const required = <Value>(value: Value | undefined): Value => {
  if (value === undefined) {
    throw new Error("The document lacks an entry the test edits")
  }
  return value
}

const exported = (): Promise<Document> => executeMutation(exportCoursesMutation, {})

const importText = async (document: string, { dryRun = false, removeMissing = false } = {}) => {
  const result = await executeMutation(importCoursesMutation, { document, dryRun, removeMissing })
  if ("problems" in result) {
    throw new Error(`The file has problems: ${JSON.stringify(result.problems)}`)
  }
  return result
}

const importDocument = (document: Document, options: { dryRun?: boolean; removeMissing?: boolean } = {}) =>
  importText(JSON.stringify(document), options)

const walkthroughOf = (document: Document) => required(document.courses.find(({ slug }) => slug === "the-walkthrough"))

const lessonOf = (document: Document, slug: string) =>
  required(
    walkthroughOf(document)
      .chapters.flatMap(({ lessons }) => lessons)
      .find((entry) => entry.slug === slug),
  )

const chapterLessons = async (chapterId: string) => {
  const rows = await db
    .select({ position: lesson.position, slug: lesson.slug })
    .from(lesson)
    .where(eq(lesson.chapterId, chapterId))
    .orderBy(asc(lesson.position))
  return rows.map(({ position, slug }) => `${String(position)}:${slug}`)
}

const addAttachments = () =>
  db.insert(lessonAttachment).values([
    {
      id: "link-one",
      kind: LESSON_ATTACHMENT_KIND.LINK,
      lessonId: LESSON_IDS.PREVIEW,
      position: 1,
      title: { "en-US": "Docs" },
      url: "/docs",
    },
    {
      id: "link-two",
      kind: LESSON_ATTACHMENT_KIND.LINK,
      lessonId: LESSON_IDS.PREVIEW,
      position: 2,
      title: { "en-US": "Code" },
      url: "https://github.com/saasyland/cli",
    },
    {
      contentType: LESSON_ATTACHMENT_FILE_TYPES.pdf,
      id: "attachment-file",
      kind: LESSON_ATTACHMENT_KIND.FILE,
      lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO,
      objectKey: OBJECT_KEY,
      position: 1,
      sizeBytes: 1,
      title: { "en-US": "Notes" },
    },
  ])

beforeEach(async () => {
  await seedCatalogue()
  signInAs(ROLE_CODES.ADMIN)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("importing the approved curriculum", () => {
  it("shows what an import creates without writing anything", async () => {
    await db.delete(course)

    const plan = await importText(CURRICULUM, { dryRun: true })

    expect(plan.tallies).toStrictEqual({
      chapters: tally({ create: 16 }),
      courses: tally({ create: 5 }),
      lessons: tally({ create: 74 }),
      links: tally({}),
    })
    expect(plan).toMatchObject({ changes: 95, files: 0, warnings: [] })
    expect(await db.select().from(course)).toStrictEqual([])
  })

  it("publishes every course with its lessons being recorded, and changes nothing the second time", async () => {
    await db.delete(course)

    await importText(CURRICULUM)
    const again = await importText(CURRICULUM)

    expect(again.changes).toBe(0)
    expect(again.tallies.lessons).toStrictEqual(tally({ unchanged: 74 }))
    const courses = await db.select({ position: course.position, status: course.status }).from(course).orderBy(asc(course.position))
    expect(courses.map(({ position }) => position)).toStrictEqual([1, 2, 3, 4, 5])
    expect(courses.every(({ status }) => status === COURSE_STATUS.PUBLISHED)).toBe(true)
    expect(await db.select({ id: lesson.id }).from(lesson).where(isNull(lesson.videoId))).toHaveLength(74)
    expect(await db.select({ id: lesson.id }).from(lesson).where(eq(lesson.status, LESSON_STATUS.PUBLISHED))).toHaveLength(74)
  })

  it("exports the same document it imported, key for key and in order", async () => {
    await db.delete(course)
    await importText(CURRICULUM)

    const document = await exported()
    expect(JSON.stringify(document)).toBe(JSON.stringify(JSON.parse(CURRICULUM)))
  })

  it("adds new courses after the ones already there", async () => {
    await importText(CURRICULUM)

    const positions = await db.select({ position: course.position, slug: course.slug }).from(course).orderBy(asc(course.position))
    expect(positions.at(-1)).toStrictEqual({ position: 7, slug: "selling-software-in-the-eu" })
  })
})

describe("importing an edited export", () => {
  it("changes nothing when the export is imported unchanged", async () => {
    await addAttachments()

    const plan = await importDocument(await exported())

    expect(plan.changes).toBe(0)
    expect(plan.tallies).toStrictEqual({
      chapters: tally({ unchanged: 2 }),
      courses: tally({ unchanged: 3 }),
      lessons: tally({ unchanged: 5 }),
      links: tally({ unchanged: 2 }),
    })
  })

  it("updates, moves and adds what changed, and keeps what the file leaves out", async () => {
    const document = await exported()
    const walkthrough = walkthroughOf(document)
    walkthrough.title = { "en-US": "The walkthrough, revised" }
    const fresh = { ...lessonOf(document, "sessions"), slug: "fresh", videoId: IDS.VIDEO }
    const boundaries = { ...lessonOf(document, "boundaries"), links: [{ title: { "en-US": "Docs" }, url: "/docs" }] }
    walkthrough.chapters = [
      {
        ...required(walkthrough.chapters[0]),
        lessons: [lessonOf(document, "billing"), lessonOf(document, "sessions"), boundaries, fresh],
        title: { "en-US": "First steps" },
      },
    ]
    document.courses = document.courses.filter(({ slug }) => slug !== "unreleased")

    const plan = await importDocument(document)

    expect(plan.tallies).toStrictEqual({
      chapters: tally({ keep: 1, update: 1 }),
      courses: tally({ keep: 1, unchanged: 1, update: 1 }),
      lessons: tally({ create: 1, keep: 2, unchanged: 1, update: 2 }),
      links: tally({ create: 1 }),
    })
    expect(await chapterLessons(IDS.CHAPTER_ONE)).toStrictEqual(["1:billing", "2:sessions", "3:boundaries", "4:fresh"])
    expect(await chapterLessons(IDS.CHAPTER_TWO)).toStrictEqual(["2:coverage", "3:unfinished"])
    expect(await db.select({ id: course.id }).from(course).where(eq(course.id, IDS.DRAFT_COURSE))).toHaveLength(1)
    const again = await importDocument(document)
    expect(again.changes).toBe(0)
  })

  it("adds a chapter, reorders a chapter's lessons around the ones it keeps and updates links by their order", async () => {
    await addAttachments()
    const document = await exported()
    const walkthrough = walkthroughOf(document)
    const second = required(walkthrough.chapters[1])
    const boundaries = lessonOf(document, "boundaries")
    boundaries.links = [{ title: { "en-US": "Read the docs" }, url: "/docs" }]
    second.lessons = [lessonOf(document, "unfinished"), lessonOf(document, "billing")]
    walkthrough.chapters.push({ lessons: [{ ...boundaries, links: [], slug: "extra" }], summary: {}, title: { "en-US": "Third" } })

    const plan = await importDocument(document)

    expect(plan.tallies).toMatchObject({
      chapters: tally({ create: 1, unchanged: 2 }),
      lessons: tally({ create: 1, keep: 1, unchanged: 2, update: 2 }),
      links: tally({ keep: 1, update: 1 }),
    })
    expect(await chapterLessons(IDS.CHAPTER_TWO)).toStrictEqual(["1:unfinished", "2:billing", "3:coverage"])
    const chapters = await db
      .select({ position: chapter.position, title: chapter.title })
      .from(chapter)
      .where(eq(chapter.courseId, IDS.COURSE))
    expect(chapters).toContainEqual({ position: 3, title: { "en-US": "Third" } })
    const again = await importDocument(document)
    expect(again.changes).toBe(0)
  })
})

describe("removing what the file does not contain", () => {
  it("deletes missing lessons, chapters, links and courses only when asked, with the uploaded files", async () => {
    await addAttachments()
    await env.MEDIA.put(OBJECT_KEY, "notes")
    const document = await exported()
    const walkthrough = walkthroughOf(document)
    walkthrough.chapters = walkthrough.chapters.slice(0, 1)
    lessonOf(document, "boundaries").links.splice(1)
    document.courses = document.courses.filter(({ slug }) => slug !== "unreleased")

    const preview = await importDocument(document, { dryRun: true, removeMissing: true })
    const kept = await importDocument(document, { dryRun: true })
    const plan = await importDocument(document, { removeMissing: true })

    expect(kept.tallies.lessons).toStrictEqual(tally({ keep: 3, unchanged: 2 }))
    expect(preview).toStrictEqual(plan)
    expect(plan.tallies).toStrictEqual({
      chapters: tally({ remove: 1, unchanged: 1 }),
      courses: tally({ remove: 1, unchanged: 2 }),
      lessons: tally({ remove: 3, unchanged: 2 }),
      links: tally({ remove: 1, unchanged: 1 }),
    })
    expect(plan.files).toBe(1)
    expect(await env.MEDIA.get(OBJECT_KEY)).toBeNull()
    expect(await chapterLessons(IDS.CHAPTER_ONE)).toStrictEqual(["1:boundaries", "2:sessions"])
    expect(await db.select().from(chapter).where(eq(chapter.id, IDS.CHAPTER_TWO))).toStrictEqual([])
  })

  it("counts everything a removed course takes with it", async () => {
    await addAttachments()
    const document = await exported()
    document.courses = document.courses.filter(({ slug }) => slug !== "the-walkthrough")

    const plan = await importDocument(document, { removeMissing: true })

    expect(plan.tallies).toStrictEqual({
      chapters: tally({ remove: 2 }),
      courses: tally({ remove: 1, unchanged: 2 }),
      lessons: tally({ remove: 5 }),
      links: tally({ remove: 2 }),
    })
    expect(plan.files).toBe(1)
    expect(await db.select().from(lesson)).toStrictEqual([])
  })
})

describe("lesson videos", () => {
  it("puts a lesson on the video the file names and keeps its video when this library lacks the one named", async () => {
    const document = await exported()
    lessonOf(document, "coverage").videoId = IDS.PLACEHOLDER_VIDEO
    lessonOf(document, "billing").videoId = MISSING_ID

    const plan = await importDocument(document)

    expect(plan.warnings).toStrictEqual([{ course: "the-walkthrough", lesson: "billing", videoId: MISSING_ID }])
    const rows = await db
      .select({ slug: lesson.slug, videoId: lesson.videoId })
      .from(lesson)
      .where(eq(lesson.chapterId, IDS.CHAPTER_TWO))
      .orderBy(asc(lesson.slug))
    expect(rows).toStrictEqual([
      { slug: "billing", videoId: IDS.VIDEO },
      { slug: "coverage", videoId: IDS.PLACEHOLDER_VIDEO },
      { slug: "unfinished", videoId: IDS.VIDEO },
    ])
  })

  it("never clears a lesson's video when the file names none", async () => {
    const document = await exported()
    const second = required(walkthroughOf(document).chapters[1])
    second.lessons = second.lessons.map(({ access, description, keyMoments, links, slug, status, summary, title }) => ({
      access,
      description,
      keyMoments,
      links,
      slug,
      status,
      summary,
      title,
    }))

    const plan = await importDocument(document)

    expect(plan.changes).toBe(0)
  })
})
