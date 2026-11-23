import { and, asc, eq, sql } from "drizzle-orm"
import type { BaseSQLiteDatabase } from "drizzle-orm/sqlite-core"
import type * as zod from "zod"

import { lesson } from "~/src/modules/lesson/lesson.schema"
import { type VIDEO_UPLOAD_FAILURES, VIDEO_UPLOAD_STATUS } from "~/src/modules/video-upload/video-upload.constants"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import { video } from "~/src/modules/video/video.schema"
import type { videoZodSchemas } from "~/src/modules/video/video.zod"

type Database<TRunResult> = BaseSQLiteDatabase<"async", TRunResult, Record<string, unknown>>

type EncodedVideo = zod.output<typeof videoZodSchemas.registerVideo>

type VideoUploadFailure = (typeof VIDEO_UPLOAD_FAILURES)[number]

export const queuedUploadsQuery = <TRunResult>(database: Database<TRunResult>) =>
  database
    .select({ fileName: videoUpload.fileName, id: videoUpload.id, lessonId: videoUpload.lessonId, objectKey: videoUpload.objectKey })
    .from(videoUpload)
    .where(eq(videoUpload.status, VIDEO_UPLOAD_STATUS.QUEUED))
    .orderBy(asc(videoUpload.createdAt), asc(videoUpload.id))

export const encodingStatusQuery = <TRunResult>(database: Database<TRunResult>, uploadId: string) =>
  database.select({ status: videoUpload.status }).from(videoUpload).where(eq(videoUpload.id, uploadId))

export const startEncodingQuery = <TRunResult>(database: Database<TRunResult>, uploadId: string) =>
  database
    .update(videoUpload)
    .set({ status: VIDEO_UPLOAD_STATUS.ENCODING })
    .where(and(eq(videoUpload.id, uploadId), eq(videoUpload.status, VIDEO_UPLOAD_STATUS.QUEUED)))

export const failEncodingQuery = <TRunResult>(
  database: Database<TRunResult>,
  { failure, uploadId }: { failure: VideoUploadFailure; uploadId: string },
) =>
  database
    .update(videoUpload)
    .set({ failure, status: VIDEO_UPLOAD_STATUS.FAILED })
    .where(and(eq(videoUpload.id, uploadId), eq(videoUpload.status, VIDEO_UPLOAD_STATUS.ENCODING)))

export const finishEncodingQueries = <TRunResult>(
  database: Database<TRunResult>,
  { lessonId, row }: { readonly lessonId: string; readonly row: EncodedVideo },
) =>
  [
    database.insert(video).values(row),
    database
      .update(lesson)
      .set({ videoId: row.id })
      .where(and(eq(lesson.id, lessonId), sql`exists (select 1 from ${videoUpload} where ${videoUpload.id} = ${row.id})`)),
    database.delete(videoUpload).where(eq(videoUpload.id, row.id)),
  ] as const
