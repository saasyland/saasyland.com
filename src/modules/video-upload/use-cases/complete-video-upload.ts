import { env } from "cloudflare:workers"

import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { and, eq } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { VIDEO_UPLOAD_MUTATION_KEYS, VIDEO_UPLOAD_STATUS } from "~/src/modules/video-upload/video-upload.constants"
import { uploadPartCount } from "~/src/modules/video-upload/video-upload.files"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import type { VideoUpload } from "~/src/modules/video-upload/video-upload.types"
import { videoUploadZodSchemas } from "~/src/modules/video-upload/video-upload.zod"

const PART_NUMBER_BASE = 1

export const completeVideoUpload = createServerFn({ method: "POST" })
  .middleware([authorized({ course: ["update"] })])
  .validator((input: VideoUpload["completeVideoUpload"]) => videoUploadZodSchemas.completeVideoUpload.parse(input))
  .handler(async ({ data: { uploadId } }) => {
    const uploading = and(eq(videoUpload.id, uploadId), eq(videoUpload.status, VIDEO_UPLOAD_STATUS.UPLOADING))
    const [upload] = await db.select().from(videoUpload).where(uploading).limit(1)

    if (upload === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    const parts = Array.from({ length: uploadPartCount(upload) }, (_, index) => {
      const partNumber = index + PART_NUMBER_BASE
      return { etag: upload.parts[String(partNumber)], partNumber }
    })
    const uploaded = parts.flatMap(({ etag, partNumber }) => (etag === undefined ? [] : [{ etag, partNumber }]))

    if (uploaded.length !== parts.length) {
      throw new AppError(ERROR_CODES.VALIDATION)
    }

    await env.MEDIA.resumeMultipartUpload(upload.objectKey, upload.multipartId).complete(uploaded)
    await db.update(videoUpload).set({ status: VIDEO_UPLOAD_STATUS.QUEUED }).where(uploading)

    return { uploadId }
  })

export const completeVideoUploadMutation = mutationOptions({
  mutationFn: (data: VideoUpload["completeVideoUpload"]) => completeVideoUpload({ data }),
  mutationKey: VIDEO_UPLOAD_MUTATION_KEYS.COMPLETE,
})
