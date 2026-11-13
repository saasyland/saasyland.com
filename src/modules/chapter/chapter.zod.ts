import zod from "zod/v4"

import { MOVE_DIRECTIONS } from "~/src/modules/_core/constants/ordering"
import { localizedTextSchema } from "~/src/modules/_core/utils/localized-text"
import { idField } from "~/src/modules/_core/utils/zod-fields"

const chapterIdInput = zod.object({
  chapterId: idField,
})

const createChapter = zod.object({
  courseId: idField,
  title: localizedTextSchema,
})

const deleteChapter = chapterIdInput

const moveChapter = chapterIdInput.extend({ direction: zod.enum(MOVE_DIRECTIONS) })

const updateChapter = chapterIdInput.extend({ title: localizedTextSchema })

export const chapterZodSchemas = {
  createChapter,
  deleteChapter,
  moveChapter,
  updateChapter,
}
