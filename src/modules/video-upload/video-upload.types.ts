import type * as zod from "zod"

import type { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import type { videoUploadZodSchemas } from "~/src/modules/video-upload/video-upload.zod"

export interface VideoUpload {
  select: typeof videoUpload.$inferSelect
  insert: typeof videoUpload.$inferInsert
  cancelVideoUpload: zod.input<typeof videoUploadZodSchemas.cancelVideoUpload>
  completeVideoUpload: zod.input<typeof videoUploadZodSchemas.completeVideoUpload>
  retryVideoUpload: zod.input<typeof videoUploadZodSchemas.retryVideoUpload>
  startVideoUpload: zod.input<typeof videoUploadZodSchemas.startVideoUpload>
  uploadVideoPart: zod.input<typeof videoUploadZodSchemas.uploadVideoPart>
}
