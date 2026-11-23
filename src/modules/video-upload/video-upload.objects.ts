import "@tanstack/react-start/server-only"

import { env } from "cloudflare:workers"

import { type SQL, eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { lesson } from "~/src/modules/lesson/lesson.schema"
import { VIDEO_UPLOAD_STATUS } from "~/src/modules/video-upload/video-upload.constants"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import type { VideoUpload } from "~/src/modules/video-upload/video-upload.types"

type UploadObject = Pick<VideoUpload["select"], "multipartId" | "objectKey" | "status">

export const uploadObjects = (lessons: SQL): Promise<UploadObject[]> =>
  db
    .select({ multipartId: videoUpload.multipartId, objectKey: videoUpload.objectKey, status: videoUpload.status })
    .from(videoUpload)
    .innerJoin(lesson, eq(lesson.id, videoUpload.lessonId))
    .where(lessons)

const abortMultipart = async ({ multipartId, objectKey }: UploadObject): Promise<void> => {
  await env.MEDIA.resumeMultipartUpload(objectKey, multipartId)
    .abort()
    .catch((error: unknown) => {
      console.warn(`R2 kept the multipart upload of ${objectKey}; its lifecycle rule aborts it`, error)
    })
}

export const removeUploadObjects = async (uploads: readonly UploadObject[]): Promise<void> => {
  if (uploads.length === 0) {
    return
  }

  await Promise.all(uploads.filter(({ status }) => status === VIDEO_UPLOAD_STATUS.UPLOADING).map((upload) => abortMultipart(upload)))
  await env.MEDIA.delete(uploads.map(({ objectKey }) => objectKey))
}
