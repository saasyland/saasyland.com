import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { v7 } from "uuid"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { nextPosition } from "~/src/modules/_core/utils/ordering"
import { CHAPTER_MUTATION_KEYS } from "~/src/modules/chapter/chapter.constants"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import type { Chapter } from "~/src/modules/chapter/chapter.types"
import { chapterZodSchemas } from "~/src/modules/chapter/chapter.zod"
import { course } from "~/src/modules/course/course.schema"

const SINGLE_ROW_LIMIT = 1

export const createChapter = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Chapter["createChapter"]) => chapterZodSchemas.createChapter.parse(input))
  .handler(async ({ data }) => {
    const [owner] = await db.select({ id: course.id }).from(course).where(eq(course.id, data.courseId)).limit(SINGLE_ROW_LIMIT)

    if (owner === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const siblings = await db.select({ position: chapter.position }).from(chapter).where(eq(chapter.courseId, data.courseId))

    return db
      .insert(chapter)
      .values({ courseId: data.courseId, id: v7(), position: nextPosition(siblings), title: data.title })
      .returning({ id: chapter.id })
      .get()
  })

export const createChapterMutation = mutationOptions({
  mutationFn: (data: Chapter["createChapter"]) => createChapter({ data }),
  mutationKey: CHAPTER_MUTATION_KEYS.CREATE,
})
