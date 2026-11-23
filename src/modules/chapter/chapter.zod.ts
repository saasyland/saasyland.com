import * as zod from "zod"

import { MOVE_DIRECTIONS } from "~/src/modules/_core/constants/ordering"
import { localizedTextSchema, optionalLocalizedTextSchema } from "~/src/modules/_core/utils/localized-text"
import { idField } from "~/src/modules/_core/utils/zod-fields"

const chapterIdInput = zod.object({
  chapterId: idField,
})

const chapterFields = zod.object({
  summary: optionalLocalizedTextSchema,
  title: localizedTextSchema,
})

const createChapter = chapterFields.extend({ courseId: idField })

const deleteChapter = chapterIdInput

const moveChapter = chapterIdInput.extend({ direction: zod.enum(MOVE_DIRECTIONS) })

const updateChapter = chapterFields.extend(chapterIdInput.shape)

export const chapterZodSchemas = {
  createChapter,
  deleteChapter,
  moveChapter,
  updateChapter,
}
