import * as zod from "zod"

import { LESSON_ATTACHMENT_KIND } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import type { LessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.types"

const storedTargetSchema = zod.discriminatedUnion("kind", [
  zod.object({
    contentType: zod.string(),
    kind: zod.literal(LESSON_ATTACHMENT_KIND.FILE),
    objectKey: zod.string(),
    sizeBytes: zod.int(),
  }),
  zod.object({
    kind: zod.literal(LESSON_ATTACHMENT_KIND.LINK),
    url: zod.string(),
  }),
])

type StoredColumns = Pick<LessonAttachment["select"], "contentType" | "kind" | "objectKey" | "sizeBytes" | "url">

export const attachmentTarget = (row: StoredColumns) => storedTargetSchema.parse(row)
