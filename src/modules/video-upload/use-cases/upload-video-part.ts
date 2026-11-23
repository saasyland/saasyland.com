import { env } from "cloudflare:workers"

import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq, sql } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { VIDEO_UPLOAD_MUTATION_KEYS, VIDEO_UPLOAD_STATUS } from "~/src/modules/video-upload/video-upload.constants"
import { uploadPartCount, uploadPartLength } from "~/src/modules/video-upload/video-upload.files"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import type { VideoUpload } from "~/src/modules/video-upload/video-upload.types"
import { videoUploadZodSchemas } from "~/src/modules/video-upload/video-upload.zod"

export const uploadVideoPart = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: VideoUpload["uploadVideoPart"]) => videoUploadZodSchemas.uploadVideoPart.parse(input))
  .handler(async ({ data: { part, partNumber, uploadId } }) => {
    const uploading = and(eq(videoUpload.id, uploadId), eq(videoUpload.status, VIDEO_UPLOAD_STATUS.UPLOADING))
    const [upload] = await db.select().from(videoUpload).where(uploading).limit(1)

    if (upload === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const isInPlan = partNumber <= uploadPartCount(upload)
    if (!isInPlan || part.size !== uploadPartLength({ ...upload, partNumber })) {
      throw new AppError(ERROR_CODES.VALIDATION)
    }

    const uploaded = await env.MEDIA.resumeMultipartUpload(upload.objectKey, upload.multipartId).uploadPart(partNumber, part)
    await db
      .update(videoUpload)
      .set({ parts: sql`json_set(${videoUpload.parts}, ${`$."${String(partNumber)}"`}, ${uploaded.etag})` })
      .where(uploading)

    return { partNumber }
  })

export const uploadVideoPartMutation = mutationOptions({
  mutationFn: (data: VideoUpload["uploadVideoPart"]) => uploadVideoPart({ data }),
  mutationKey: VIDEO_UPLOAD_MUTATION_KEYS.UPLOAD_PART,
})
