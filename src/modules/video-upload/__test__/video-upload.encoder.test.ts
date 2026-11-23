import { eq } from "drizzle-orm"
import { beforeEach, describe, expect, it } from "vite-plus/test"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { IDS, LESSON_IDS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { VIDEO_UPLOAD_FAILURE, VIDEO_UPLOAD_PART_BYTES, VIDEO_UPLOAD_STATUS } from "~/src/modules/video-upload/video-upload.constants"
import {
  encodingStatusQuery,
  failEncodingQuery,
  finishEncodingQueries,
  queuedUploadsQuery,
  startEncodingQuery,
} from "~/src/modules/video-upload/video-upload.encoder"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import { video } from "~/src/modules/video/video.schema"

const UPLOAD_ID = "01960000-0000-7000-8000-00000000e001"

const ROW = {
  captionLocales: [],
  durationMs: 61_000,
  height: 1080,
  id: UPLOAD_ID,
  sizeBytes: 9_000_000,
  title: "take",
  width: 1920,
}

const queue = (lessonId: string = LESSON_IDS.PAID) =>
  db.insert(videoUpload).values({
    contentType: "video/mp4",
    fileName: "take.mp4",
    id: UPLOAD_ID,
    lastModified: 1,
    lessonId,
    multipartId: "multipart",
    objectKey: `uploads/${UPLOAD_ID}/source.mp4`,
    partBytes: VIDEO_UPLOAD_PART_BYTES,
    sizeBytes: 9_000_000,
    status: VIDEO_UPLOAD_STATUS.QUEUED,
  })

const statusOf = async (): Promise<string | undefined> => {
  const [row] = await encodingStatusQuery(db, UPLOAD_ID)
  return row?.status
}

const videoOf = async (lessonId: string) => {
  const [row] = await db.select({ videoId: lesson.videoId }).from(lesson).where(eq(lesson.id, lessonId))
  return row?.videoId
}

beforeEach(async () => {
  await seedCatalogue()
  await db.delete(videoUpload)
})

describe("video encoder queries", () => {
  it("lists the uploads waiting for the encoder", async () => {
    await queue()

    await expect(queuedUploadsQuery(db)).resolves.toStrictEqual([
      { fileName: "take.mp4", id: UPLOAD_ID, lessonId: LESSON_IDS.PAID, objectKey: `uploads/${UPLOAD_ID}/source.mp4` },
    ])
  })

  it("marks an upload as encoding, then as failed with the reason", async () => {
    await queue()

    await startEncodingQuery(db, UPLOAD_ID)
    await expect(statusOf()).resolves.toBe(VIDEO_UPLOAD_STATUS.ENCODING)
    await expect(queuedUploadsQuery(db)).resolves.toStrictEqual([])

    await failEncodingQuery(db, { failure: VIDEO_UPLOAD_FAILURE.UNREADABLE, uploadId: UPLOAD_ID })
    const [row] = await db.select().from(videoUpload).where(eq(videoUpload.id, UPLOAD_ID))
    expect(row).toMatchObject({ failure: VIDEO_UPLOAD_FAILURE.UNREADABLE, status: VIDEO_UPLOAD_STATUS.FAILED })
  })

  it("registers the encoded video, puts it on the lesson in place of the old one and forgets the upload", async () => {
    await queue()

    await db.batch([...finishEncodingQueries(db, { lessonId: LESSON_IDS.PAID, row: ROW })])

    await expect(videoOf(LESSON_IDS.PAID)).resolves.toBe(UPLOAD_ID)
    await expect(db.select({ id: video.id }).from(video).where(eq(video.id, IDS.VIDEO))).resolves.toHaveLength(1)
    await expect(statusOf()).resolves.toBeUndefined()
  })

  it("leaves the lesson alone when its upload was cancelled during the encoding", async () => {
    await db.batch([...finishEncodingQueries(db, { lessonId: LESSON_IDS.PAID, row: ROW })])

    await expect(videoOf(LESSON_IDS.PAID)).resolves.toBe(IDS.VIDEO)
  })
})
