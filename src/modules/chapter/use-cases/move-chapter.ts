import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { asc, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { reorder } from "~/src/modules/_core/utils/ordering"
import { CHAPTER_MUTATION_KEYS } from "~/src/modules/chapter/chapter.constants"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import type { Chapter } from "~/src/modules/chapter/chapter.types"
import { chapterZodSchemas } from "~/src/modules/chapter/chapter.zod"

const SINGLE_ROW_LIMIT = 1

export const moveChapter = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Chapter["moveChapter"]) => chapterZodSchemas.moveChapter.parse(input))
  .handler(async ({ data: { chapterId, direction } }) => {
    const [row] = await db.select({ courseId: chapter.courseId }).from(chapter).where(eq(chapter.id, chapterId)).limit(SINGLE_ROW_LIMIT)

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const siblings = await db
      .select({ id: chapter.id, position: chapter.position })
      .from(chapter)
      .where(eq(chapter.courseId, row.courseId))
      .orderBy(asc(chapter.position), asc(chapter.id))
    const [first, ...rest] = reorder(siblings, chapterId, direction).map(({ id, position }) =>
      db.update(chapter).set({ position }).where(eq(chapter.id, id)),
    )

    if (first !== undefined) {
      await db.batch([first, ...rest])
    }

    return { chapterId }
  })

export const moveChapterMutation = mutationOptions({
  mutationFn: (data: Chapter["moveChapter"]) => moveChapter({ data }),
  mutationKey: CHAPTER_MUTATION_KEYS.MOVE,
})
