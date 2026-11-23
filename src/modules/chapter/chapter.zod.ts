import * as zod from "zod"

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

const updateChapter = chapterFields.extend(chapterIdInput.shape)

export const chapterZodSchemas = {
  createChapter,
  deleteChapter,
  updateChapter,
}
