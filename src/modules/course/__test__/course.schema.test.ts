import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { createTableRelationsHelpers, extractTablesRelationalConfig, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { slugField } from "~/src/modules/_core/utils/zod-fields"
import { chapter, chapterRelations } from "~/src/modules/chapter/chapter.schema"
import { course, courseRelations } from "~/src/modules/course/course.schema"
import { courseZodSchemas } from "~/src/modules/course/course.zod"
import { lessonAttachment, lessonAttachmentRelations } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import { lessonProgressZodSchemas } from "~/src/modules/lesson-progress/lesson-progress.zod"
import { lesson, lessonRelations } from "~/src/modules/lesson/lesson.schema"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"

const parents = (table: typeof lesson | typeof chapter | typeof lessonProgress | typeof lessonAttachment) =>
  getTableConfig(table).foreignKeys.map((foreignKey) => getTableName(foreignKey.reference().foreignTable))

describe("course schemas", () => {
  it("materializes the course tables and their relations through the drizzle adapter", () => {
    expect(
      drizzleAdapter(
        {},
        {
          provider: "sqlite",
          schema: {
            chapter,
            chapterRelations,
            course,
            courseRelations,
            lesson,
            lessonAttachment,
            lessonAttachmentRelations,
            lessonProgress,
            lessonRelations,
          },
        },
      ),
    ).toBeDefined()
  })

  it("links every foreign key to its parent table", () => {
    expect(parents(chapter)).toStrictEqual(["course"])
    expect(parents(lesson)).toStrictEqual(["chapter", "course", "video"])
    expect(parents(lessonProgress)).toStrictEqual(["lesson", "user"])
    expect(parents(lessonAttachment)).toStrictEqual(["lesson"])
  })

  it("relates courses, chapters, lessons, their materials and videos", () => {
    const { tables } = extractTablesRelationalConfig(
      { chapter, chapterRelations, course, courseRelations, lesson, lessonAttachment, lessonAttachmentRelations, lessonRelations },
      createTableRelationsHelpers,
    )

    expect(Object.keys(tables["course"]?.relations ?? {})).toStrictEqual(["chapters", "lessons"])
    expect(Object.keys(tables["chapter"]?.relations ?? {})).toStrictEqual(["course", "lessons"])
    expect(Object.keys(tables["lesson"]?.relations ?? {})).toStrictEqual(["attachments", "chapter", "course", "video"])
    expect(Object.keys(tables["lessonAttachment"]?.relations ?? {})).toStrictEqual(["lesson"])
  })

  it("stamps every update", () => {
    for (const table of [course, chapter, lesson, lessonProgress, lessonAttachment]) {
      expect(table.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date)
    }
  })

  it.each([
    ["the-walkthrough", true],
    ["lesson-01", true],
    ["The-Walkthrough", false],
    ["double--dash", false],
    ["-leading", false],
    ["", false],
    ["a".repeat(97), false],
  ])("accepts the slug %s: %s", (slug, valid) => {
    expect(slugField.safeParse(slug).success).toBe(valid)
  })

  it("validates the public inputs", () => {
    expect(courseZodSchemas.getCourse.safeParse({ locale: "pl-PL", slug: "the-walkthrough" }).success).toBe(true)
    expect(courseZodSchemas.getCatalogue.safeParse({ locale: "en-GB" }).success).toBe(false)
    expect(lessonZodSchemas.getLessonPlayback.safeParse({ courseSlug: "a", lessonSlug: "B" }).success).toBe(false)
    expect(lessonProgressZodSchemas.saveLessonProgress.safeParse({ completed: false, lessonId: "lesson", positionMs: -1 }).success).toBe(
      false,
    )
  })
})
