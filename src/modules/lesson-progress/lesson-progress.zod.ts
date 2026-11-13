import zod from "zod/v4"

import { idField } from "~/src/modules/_core/utils/zod-fields"

const saveLessonProgress = zod.object({
  completed: zod.boolean(),
  lessonId: idField,
  positionMs: zod.int().nonnegative(),
})

export const lessonProgressZodSchemas = {
  saveLessonProgress,
}
