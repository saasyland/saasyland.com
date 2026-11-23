import { env } from "cloudflare:workers"

import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { eq } from "drizzle-orm"
import { v7 } from "uuid"

import { RATE_LIMIT_WINDOW_SECONDS, authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { rethrowAsConflict } from "~/src/integrations/drizzle-orm/drizzle.errors"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LESSON_FORMAT } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import {
  VIDEO_UPLOADS_PER_MINUTE,
  VIDEO_UPLOAD_MUTATION_KEYS,
  VIDEO_UPLOAD_PART_BYTES,
  VIDEO_UPLOAD_STATUS,
} from "~/src/modules/video-upload/video-upload.constants"
import { videoUploadObjectKey } from "~/src/modules/video-upload/video-upload.files"
import { removeUploadObjects } from "~/src/modules/video-upload/video-upload.objects"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import type { VideoUpload } from "~/src/modules/video-upload/video-upload.types"
import { videoUploadZodSchemas } from "~/src/modules/video-upload/video-upload.zod"

const START_RATE_LIMIT = { max: VIDEO_UPLOADS_PER_MINUTE, window: RATE_LIMIT_WINDOW_SECONDS } as const

const uploadedParts = (parts: VideoUpload["select"]["parts"]): number[] => Object.keys(parts).map(Number)

const isSameFile = (upload: VideoUpload["select"], file: { fileName: string; lastModified: number; sizeBytes: number }): boolean =>
  upload.status === VIDEO_UPLOAD_STATUS.UPLOADING &&
  upload.fileName === file.fileName &&
  upload.sizeBytes === file.sizeBytes &&
  upload.lastModified === file.lastModified

export const startVideoUpload = createServerFn({ method: "POST" })
  .middleware([withRateLimit("start-video-upload", START_RATE_LIMIT), authorized({ course: ["update"] })])
  .validator((input: VideoUpload["startVideoUpload"]) => videoUploadZodSchemas.startVideoUpload.parse(input))
  .handler(async ({ data: { fileName, lastModified, lessonId, sizeBytes } }) => {
    const [owner] = await db.select({ format: lesson.format }).from(lesson).where(eq(lesson.id, lessonId)).limit(1)

    if (owner === undefined) {
      throw new AppError(ERROR_CODES.NOT_FOUND)
    }

    if (owner.format !== LESSON_FORMAT.VIDEO) {
      throw new AppError(ERROR_CODES.CONFLICT)
    }

    const [existing] = await db.select().from(videoUpload).where(eq(videoUpload.lessonId, lessonId)).limit(1)
    const file = { fileName: fileName.fileName, lastModified, sizeBytes }

    if (existing !== undefined && isSameFile(existing, file)) {
      return { partBytes: existing.partBytes, parts: uploadedParts(existing.parts), uploadId: existing.id }
    }

    if (existing !== undefined) {
      await db.delete(videoUpload).where(eq(videoUpload.id, existing.id))
      await removeUploadObjects([existing])
    }

    const id = v7()
    const objectKey = videoUploadObjectKey({ extension: fileName.extension, uploadId: id })
    const multipart = await env.MEDIA.createMultipartUpload(objectKey, { httpMetadata: { contentType: fileName.contentType } })

    await db
      .insert(videoUpload)
      .values({
        ...file,
        contentType: fileName.contentType,
        id,
        lessonId,
        multipartId: multipart.uploadId,
        objectKey,
        partBytes: VIDEO_UPLOAD_PART_BYTES,
      })
      .catch(rethrowAsConflict)

    return { partBytes: VIDEO_UPLOAD_PART_BYTES, parts: [], uploadId: id }
  })

export const startVideoUploadMutation = mutationOptions({
  mutationFn: (data: VideoUpload["startVideoUpload"]) => startVideoUpload({ data }),
  mutationKey: VIDEO_UPLOAD_MUTATION_KEYS.START,
})
