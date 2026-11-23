import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, sql } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { VIDEO_UPLOAD_MUTATION_KEYS, VIDEO_UPLOAD_STATUS } from "~/src/modules/video-upload/video-upload.constants"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import type { VideoUpload } from "~/src/modules/video-upload/video-upload.types"
import { videoUploadZodSchemas } from "~/src/modules/video-upload/video-upload.zod"

export const retryVideoUpload = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: VideoUpload["retryVideoUpload"]) => videoUploadZodSchemas.retryVideoUpload.parse(input))
  .handler(async ({ data: { uploadId } }) => {
    const [row] = await db
      .update(videoUpload)
      .set({ failure: sql`null`, status: VIDEO_UPLOAD_STATUS.QUEUED })
      .where(and(eq(videoUpload.id, uploadId), eq(videoUpload.status, VIDEO_UPLOAD_STATUS.FAILED)))
      .returning({ id: videoUpload.id })

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    return { uploadId: row.id }
  })

export const retryVideoUploadMutation = mutationOptions({
  mutationFn: (data: VideoUpload["retryVideoUpload"]) => retryVideoUpload({ data }),
  mutationKey: VIDEO_UPLOAD_MUTATION_KEYS.RETRY,
})
