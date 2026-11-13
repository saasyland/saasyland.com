import type { chapter } from "~/src/modules/chapter/chapter.schema"

export interface Chapter {
  select: typeof chapter.$inferSelect
  insert: typeof chapter.$inferInsert
}
