import type * as zod from "zod"

import type { chapter } from "~/src/modules/chapter/chapter.schema"
import type { chapterZodSchemas } from "~/src/modules/chapter/chapter.zod"

export interface Chapter {
  select: typeof chapter.$inferSelect
  insert: typeof chapter.$inferInsert
  createChapter: zod.input<typeof chapterZodSchemas.createChapter>
  deleteChapter: zod.input<typeof chapterZodSchemas.deleteChapter>
  updateChapter: zod.input<typeof chapterZodSchemas.updateChapter>
}
