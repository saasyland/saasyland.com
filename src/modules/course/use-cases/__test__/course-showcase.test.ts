import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import {
  createAuthSessionFixture,
  createMissingAuthSessionResult,
} from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { IDS, LESSON_IDS, USERS, playLessonOn, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL, COURSE_SHOWCASE, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import { courseShowcaseQuery } from "~/src/modules/course/use-cases/get-course-showcase"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"

const EXTRA_COURSES = 4
const EXTRA_LESSONS = 4
const FIRST_EXTRA_POSITION = 4

vi.mock("~/src/data/course-access.entries", () => import("~/src/modules/course/__test__/fixtures/course-access"))

const signIn = (userId: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role: ROLE_CODES.CUSTOMER, userId }))
}

const showcase = (locale: "en-US" | "pl-PL" = "en-US") => executeQuery(courseShowcaseQuery({ locale }))

beforeEach(async () => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createMissingAuthSessionResult())
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getCourseShowcase", () => {
  it("lists the published courses in catalogue order with their counts and first lessons", async () => {
    expect(await showcase()).toStrictEqual([
      {
        durationMs: 375_000,
        icon: COURSE_ICON.BOOK_OPEN,
        id: IDS.COURSE,
        kind: COURSE_KIND.COURSE,
        lessonCount: 4,
        lessons: [
          { access: LESSON_ACCESS.PREVIEW, durationMs: 125_000, locked: false, recording: false, slug: "boundaries", title: "Boundaries" },
          { access: LESSON_ACCESS.ACCOUNT, durationMs: 125_000, locked: true, recording: false, slug: "sessions", title: "Sessions" },
          { access: LESSON_ACCESS.PAID, durationMs: 125_000, locked: true, recording: false, slug: "billing", title: "Billing" },
          { access: LESSON_ACCESS.PAID, durationMs: null, locked: true, recording: true, slug: "coverage", title: "Coverage" },
        ],
        level: COURSE_LEVEL.BEGINNER,
        previewCount: 1,
        recordedCount: 3,
        slug: "the-walkthrough",
        title: "The walkthrough",
      },
      {
        durationMs: 0,
        icon: COURSE_ICON.BOOK_OPEN,
        id: IDS.TUTORIAL,
        kind: COURSE_KIND.TUTORIAL,
        lessonCount: 0,
        lessons: [],
        level: COURSE_LEVEL.BEGINNER,
        previewCount: 0,
        recordedCount: 0,
        slug: "one-off",
        title: "One-off tutorial",
      },
    ])
  })

  it("localizes course and lesson titles and falls back to English", async () => {
    const courses = await showcase("pl-PL")

    expect(courses.map(({ lessons, title }) => [title, lessons.map((entry) => entry.title)])).toStrictEqual([
      ["Przewodnik", ["Granice", "Sessions", "Billing", "Coverage"]],
      ["One-off tutorial", []],
    ])
  })

  it("shows only the first courses, each with its full counts", async () => {
    await db.insert(course).values(
      Array.from({ length: EXTRA_COURSES }, (_, index) => ({
        id: `01960000-0000-7000-8000-00000000c2${String(index).padStart(2, "0")}`,
        position: 0,
        slug: `lead-${String(index)}`,
        status: COURSE_STATUS.PUBLISHED,
        summary: { "en-US": "First in the catalogue." },
        title: { "en-US": `Lead ${String(index)}` },
      })),
    )
    await db.insert(lesson).values(
      Array.from({ length: EXTRA_LESSONS }, (_, index) => ({
        chapterId: IDS.CHAPTER_TWO,
        courseId: IDS.COURSE,
        id: `01960000-0000-7000-8000-00000000a1${String(index).padStart(2, "0")}`,
        position: FIRST_EXTRA_POSITION + index,
        slug: `extra-${String(index)}`,
        status: LESSON_STATUS.PUBLISHED,
        summary: { "en-US": "More." },
        title: { "en-US": `Extra ${String(index)}` },
      })),
    )

    const courses = await showcase()

    expect(courses).toHaveLength(COURSE_SHOWCASE.COURSES)
    expect(courses.map(({ lessonCount, lessons, slug }) => [slug, lessonCount, lessons.length])).toStrictEqual([
      ["lead-0", 0, 0],
      ["lead-1", 0, 0],
      ["lead-2", 0, 0],
      ["lead-3", 0, 0],
      ["the-walkthrough", 8, COURSE_SHOWCASE.LESSONS],
    ])
    expect(courses.at(-1)?.lessons.at(-1)?.slug).toBe("extra-0")
  })

  it("opens the account lessons for a signed-in customer", async () => {
    signIn(USERS.VISITOR)

    const [walkthrough] = await showcase()

    expect(walkthrough?.lessons.map(({ locked, slug }) => [slug, locked])).toStrictEqual([
      ["boundaries", false],
      ["sessions", false],
      ["billing", true],
      ["coverage", true],
    ])
  })

  it("opens every lesson for a learner with course access", async () => {
    signIn(USERS.ENTITLED)

    const [walkthrough] = await showcase()

    expect(walkthrough?.lessons.every(({ locked }) => !locked)).toBe(true)
  })

  it("marks the lessons without a recording and leaves them out of the length", async () => {
    await playLessonOn(LESSON_IDS.PREVIEW, IDS.PLACEHOLDER_VIDEO)
    await db.update(lesson).set({ videoId: null }).where(eq(lesson.id, LESSON_IDS.ACCOUNT))

    const [walkthrough] = await showcase()

    expect(walkthrough).toMatchObject({ durationMs: 125_000, lessonCount: 4, recordedCount: 1 })
    expect(walkthrough?.lessons.map(({ durationMs, recording, slug }) => [slug, recording, durationMs])).toStrictEqual([
      ["boundaries", true, null],
      ["sessions", true, null],
      ["billing", false, 125_000],
      ["coverage", true, null],
    ])
  })

  it("returns no course when nothing is published", async () => {
    await db.delete(course)

    expect(await showcase()).toStrictEqual([])
  })
})
