import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vite-plus/test"

import { executeQuery } from "~/src/platform/testing/lib/query"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { IDS, LESSON_IDS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { COURSE_KIND, COURSE_SHOWCASE, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { course } from "~/src/modules/course/course.schema"
import { courseShowcaseQuery } from "~/src/modules/course/use-cases/get-course-showcase"
import { LESSON_ACCESS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"

const LEAD_COURSE_ID = "01960000-0000-7000-8000-00000000c004"
const EXTRA_LESSONS = 4

const showcase = (locale: "en-US" | "pl-PL" = "en-US") => executeQuery(courseShowcaseQuery({ locale }))

beforeEach(async () => {
  await seedCatalogue()
})

describe("getCourseShowcase", () => {
  it("lists the published courses in catalogue order with their lessons in curriculum order", async () => {
    expect(await showcase()).toStrictEqual({
      courses: [
        {
          durationMs: 375_000,
          id: IDS.COURSE,
          kind: COURSE_KIND.COURSE,
          lessonCount: 4,
          lessons: [
            { access: LESSON_ACCESS.PREVIEW, durationMs: 125_000, id: LESSON_IDS.PREVIEW, slug: "boundaries", title: "Boundaries" },
            { access: LESSON_ACCESS.ACCOUNT, durationMs: 125_000, id: LESSON_IDS.ACCOUNT, slug: "sessions", title: "Sessions" },
            { access: LESSON_ACCESS.PAID, durationMs: 125_000, id: LESSON_IDS.PAID, slug: "billing", title: "Billing" },
            { access: LESSON_ACCESS.PAID, durationMs: null, id: LESSON_IDS.PAID_WITHOUT_VIDEO, slug: "coverage", title: "Coverage" },
          ],
          previewCount: 1,
          slug: "the-walkthrough",
          title: "The walkthrough",
        },
        {
          durationMs: 0,
          id: IDS.TUTORIAL,
          kind: COURSE_KIND.TUTORIAL,
          lessonCount: 0,
          lessons: [],
          previewCount: 0,
          slug: "one-off",
          title: "One-off tutorial",
        },
      ],
      freeLesson: { courseSlug: "the-walkthrough", slug: "boundaries", title: "Boundaries" },
    })
  })

  it("localizes course and lesson titles and falls back to English", async () => {
    const { courses, freeLesson } = await showcase("pl-PL")

    expect(courses.map(({ lessons, title }) => [title, lessons.map((entry) => entry.title)])).toStrictEqual([
      ["Przewodnik", ["Granice", "Sessions", "Billing", "Coverage"]],
      ["One-off tutorial", []],
    ])
    expect(freeLesson?.title).toBe("Granice")
  })

  it("shows only the first courses and the opening lessons of each, with the full counts", async () => {
    await db.insert(course).values({
      id: LEAD_COURSE_ID,
      position: 0,
      slug: "lead",
      status: COURSE_STATUS.PUBLISHED,
      summary: { "en-US": "First in the catalogue." },
      title: { "en-US": "Lead" },
    })
    await db.insert(lesson).values(
      Array.from({ length: EXTRA_LESSONS }, (_, index) => ({
        chapterId: IDS.CHAPTER_TWO,
        courseId: IDS.COURSE,
        id: `01960000-0000-7000-8000-00000000a1${String(index).padStart(2, "0")}`,
        position: COURSE_SHOWCASE.LESSONS + index,
        slug: `extra-${String(index)}`,
        status: LESSON_STATUS.PUBLISHED,
        summary: { "en-US": "More." },
        title: { "en-US": `Extra ${String(index)}` },
      })),
    )

    const { courses } = await showcase()

    expect(courses).toHaveLength(COURSE_SHOWCASE.COURSES)
    expect(courses.map(({ lessonCount, lessons, slug }) => [slug, lessonCount, lessons.map((entry) => entry.slug)])).toStrictEqual([
      ["lead", 0, []],
      ["the-walkthrough", 8, ["boundaries", "sessions", "billing", "coverage", "extra-0", "extra-1"]],
    ])
  })

  it("offers no free lesson when no free preview has a recording", async () => {
    await db.update(lesson).set({ videoId: null }).where(eq(lesson.id, LESSON_IDS.PREVIEW))

    const { courses, freeLesson } = await showcase()

    expect(courses[0]?.previewCount).toBe(1)
    expect(freeLesson).toBeUndefined()
  })

  it("returns an empty showcase when nothing is published", async () => {
    await db.delete(course)

    expect(await showcase()).toStrictEqual({ courses: [], freeLesson: undefined })
  })
})
