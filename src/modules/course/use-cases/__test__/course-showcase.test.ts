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
const FIRST_EXTRA_POSITION = 4

const showcase = (locale: "en-US" | "pl-PL" = "en-US") => executeQuery(courseShowcaseQuery({ locale }))

beforeEach(async () => {
  await seedCatalogue()
})

describe("getCourseShowcase", () => {
  it("lists the published courses in catalogue order with their counts and the first free lesson that has a recording", async () => {
    expect(await showcase()).toStrictEqual([
      {
        durationMs: 375_000,
        freeLesson: { slug: "boundaries", title: "Boundaries" },
        id: IDS.COURSE,
        kind: COURSE_KIND.COURSE,
        lessonCount: 4,
        previewCount: 1,
        slug: "the-walkthrough",
        title: "The walkthrough",
      },
      {
        durationMs: 0,
        freeLesson: undefined,
        id: IDS.TUTORIAL,
        kind: COURSE_KIND.TUTORIAL,
        lessonCount: 0,
        previewCount: 0,
        slug: "one-off",
        title: "One-off tutorial",
      },
    ])
  })

  it("localizes course and lesson titles and falls back to English", async () => {
    const courses = await showcase("pl-PL")

    expect(courses.map(({ freeLesson, title }) => [title, freeLesson?.title])).toStrictEqual([
      ["Przewodnik", "Granice"],
      ["One-off tutorial", undefined],
    ])
  })

  it("shows only the first courses, each with its full counts", async () => {
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
        position: FIRST_EXTRA_POSITION + index,
        slug: `extra-${String(index)}`,
        status: LESSON_STATUS.PUBLISHED,
        summary: { "en-US": "More." },
        title: { "en-US": `Extra ${String(index)}` },
      })),
    )

    const courses = await showcase()

    expect(courses).toHaveLength(COURSE_SHOWCASE.COURSES)
    expect(courses.map(({ lessonCount, slug }) => [slug, lessonCount])).toStrictEqual([
      ["lead", 0],
      ["the-walkthrough", 8],
    ])
  })

  it("takes the free lesson in curriculum order and skips a free preview without a recording", async () => {
    await db.update(lesson).set({ access: LESSON_ACCESS.PREVIEW }).where(eq(lesson.id, LESSON_IDS.PAID))
    const [first] = await showcase()

    await db.update(lesson).set({ videoId: null }).where(eq(lesson.id, LESSON_IDS.PREVIEW))
    const [second] = await showcase()

    expect(first?.freeLesson?.slug).toBe("boundaries")
    expect(second?.freeLesson?.slug).toBe("billing")
    expect(second?.previewCount).toBe(2)
  })

  it("offers no free lesson when no free preview has a recording", async () => {
    await db.update(lesson).set({ videoId: null }).where(eq(lesson.id, LESSON_IDS.PREVIEW))

    const [walkthrough] = await showcase()

    expect(walkthrough?.previewCount).toBe(1)
    expect(walkthrough?.freeLesson).toBeUndefined()
  })

  it("returns no course when nothing is published", async () => {
    await db.delete(course)

    expect(await showcase()).toStrictEqual([])
  })
})
