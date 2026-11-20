import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_DOCUMENT_MAX_LENGTH, COURSE_STATUS } from "~/src/modules/course/course.constants"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"

const CURRICULUM = readFileSync("content/courses/saasy-land-courses.json", "utf8")

const parsed = courseZodSchemas.courseDocument.parse(JSON.parse(CURRICULUM))

const lessons = parsed.courses.flatMap(({ chapters }) => chapters.flatMap((chapter) => chapter.lessons))

const texts = parsed.courses.flatMap((course) => [
  course.title,
  course.summary,
  ...course.chapters.flatMap((chapter) => [chapter.title, ...chapter.lessons.flatMap((lesson) => [lesson.title, lesson.summary])]),
])

describe("the curriculum file", () => {
  it("is a course file the import accepts", () => {
    expect(courseZodSchemas.importCourses.parse({ document: CURRICULUM, dryRun: true, removeMissing: false }).document).toBe(CURRICULUM)
    expect(CURRICULUM.length).toBeLessThan(COURSE_DOCUMENT_MAX_LENGTH)
  })

  it("publishes every course and lesson, each on no video until its recording exists", () => {
    expect(parsed.courses.map(({ status }) => status)).toStrictEqual(parsed.courses.map(() => COURSE_STATUS.PUBLISHED))
    expect(lessons.filter(({ status }) => status !== LESSON_STATUS.PUBLISHED)).toStrictEqual([])
    expect(lessons.filter(({ videoId }) => videoId !== undefined)).toStrictEqual([])
  })

  it("has every title, summary, outcome and prerequisite in every locale", () => {
    for (const text of texts) {
      expect(Object.keys(text).toSorted()).toStrictEqual(I18N.SUPPORTED_LOCALES.toSorted())
    }
    for (const course of parsed.courses) {
      for (const list of [course.outcomes, course.prerequisites]) {
        const lengths = I18N.SUPPORTED_LOCALES.map((locale) => list[locale]?.length)
        expect(lengths).toStrictEqual(I18N.SUPPORTED_LOCALES.map(() => list[I18N.DEFAULT_LOCALE]?.length))
      }
    }
  })
})
