import zod from "zod/v4"

import { slugField } from "~/src/modules/_core/utils/zod-fields"

const getLessonPlayback = zod.object({
  courseSlug: slugField,
  lessonSlug: slugField,
})

export const lessonZodSchemas = {
  getLessonPlayback,
}
