import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { CHAPTER_MUTATION_KEYS } from "~/src/modules/chapter/chapter.constants"
import { chapter } from "~/src/modules/chapter/chapter.schema"
import type { Chapter } from "~/src/modules/chapter/chapter.types"
import { chapterZodSchemas } from "~/src/modules/chapter/chapter.zod"

export const deleteChapter = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: Chapter["deleteChapter"]) => chapterZodSchemas.deleteChapter.parse(input))
  .handler(async ({ data }) => {
    const [row] = await db.delete(chapter).where(eq(chapter.id, data.chapterId)).returning({ id: chapter.id })

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return row
  })

export const deleteChapterMutation = mutationOptions({
  mutationFn: (data: Chapter["deleteChapter"]) => deleteChapter({ data }),
  mutationKey: CHAPTER_MUTATION_KEYS.DELETE,
})
