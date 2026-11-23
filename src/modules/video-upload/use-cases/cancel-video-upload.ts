import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { VIDEO_UPLOAD_MUTATION_KEYS } from "~/src/modules/video-upload/video-upload.constants"
import { removeUploadObjects } from "~/src/modules/video-upload/video-upload.objects"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import type { VideoUpload } from "~/src/modules/video-upload/video-upload.types"
import { videoUploadZodSchemas } from "~/src/modules/video-upload/video-upload.zod"

export const cancelVideoUpload = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: VideoUpload["cancelVideoUpload"]) => videoUploadZodSchemas.cancelVideoUpload.parse(input))
  .handler(async ({ data: { uploadId } }) => {
    const [row] = await db.delete(videoUpload).where(eq(videoUpload.id, uploadId)).returning({
      id: videoUpload.id,
      multipartId: videoUpload.multipartId,
      objectKey: videoUpload.objectKey,
      status: videoUpload.status,
    })

    if (row === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    await removeUploadObjects([row])

    return { uploadId: row.id }
  })

export const cancelVideoUploadMutation = mutationOptions({
  mutationFn: (data: VideoUpload["cancelVideoUpload"]) => cancelVideoUpload({ data }),
  mutationKey: VIDEO_UPLOAD_MUTATION_KEYS.CANCEL,
})
