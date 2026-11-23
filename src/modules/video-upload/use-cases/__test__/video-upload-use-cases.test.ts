import { env } from "cloudflare:workers"

import { eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { deleteChapterMutation } from "~/src/modules/chapter/use-cases/delete-chapter"
import { IDS, LESSON_IDS, USERS, makeTextLesson, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { deleteCoursesMutation } from "~/src/modules/course/use-cases/delete-courses"
import { deleteLessonMutation } from "~/src/modules/lesson/use-cases/delete-lesson"
import { cancelVideoUploadMutation } from "~/src/modules/video-upload/use-cases/cancel-video-upload"
import { completeVideoUploadMutation } from "~/src/modules/video-upload/use-cases/complete-video-upload"
import { retryVideoUploadMutation } from "~/src/modules/video-upload/use-cases/retry-video-upload"
import { startVideoUploadMutation } from "~/src/modules/video-upload/use-cases/start-video-upload"
import { uploadVideoPartMutation } from "~/src/modules/video-upload/use-cases/upload-video-part"
import {
  VIDEO_UPLOADS_PER_MINUTE,
  VIDEO_UPLOAD_FAILURE,
  VIDEO_UPLOAD_MAX_BYTES,
  VIDEO_UPLOAD_PART_BYTES,
  VIDEO_UPLOAD_STATUS,
} from "~/src/modules/video-upload/video-upload.constants"
import { partFormData, videoUploadObjectKey } from "~/src/modules/video-upload/video-upload.files"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"
const LAST_MODIFIED = 1_763_856_000_000
const TAIL_BYTES = 3
const SIZE_BYTES = VIDEO_UPLOAD_PART_BYTES + TAIL_BYTES

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

const start = (overrides: { fileName?: string; lastModified?: number; lessonId?: string; sizeBytes?: number } = {}) =>
  executeMutation(startVideoUploadMutation, {
    fileName: "Lesson take 1.MP4",
    lastModified: LAST_MODIFIED,
    lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO,
    sizeBytes: SIZE_BYTES,
    ...overrides,
  })

const sendPart = (uploadId: string, partNumber: number, bytes: number) => {
  const part = new Blob([new Uint8Array(bytes).fill(partNumber)])
  return executeMutation(uploadVideoPartMutation, partFormData({ part, partNumber, uploadId }))
}

const uploadRow = async (uploadId: string) => {
  const [row] = await db.select().from(videoUpload).where(eq(videoUpload.id, uploadId))
  return row
}

const uploadWhole = async (): Promise<string> => {
  const { uploadId } = await start()
  await sendPart(uploadId, 1, VIDEO_UPLOAD_PART_BYTES)
  await sendPart(uploadId, 2, TAIL_BYTES)
  await executeMutation(completeVideoUploadMutation, { uploadId })
  return uploadId
}

const sourceKey = (uploadId: string): string => videoUploadObjectKey({ extension: "mp4", uploadId })

beforeEach(async () => {
  await seedCatalogue()
  await db.delete(videoUpload)
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("startVideoUpload", () => {
  it("opens a multipart upload in R2 for the lesson and records the file it expects", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const started = await start()

    expect(started).toMatchObject({ partBytes: VIDEO_UPLOAD_PART_BYTES, parts: [] })
    await expect(uploadRow(started.uploadId)).resolves.toMatchObject({
      contentType: "video/mp4",
      failure: null,
      fileName: "Lesson-take-1.MP4",
      lastModified: LAST_MODIFIED,
      lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO,
      objectKey: sourceKey(started.uploadId),
      parts: {},
      sizeBytes: SIZE_BYTES,
      status: VIDEO_UPLOAD_STATUS.UPLOADING,
    })
  })

  it("resumes the upload of the same file with the parts already stored", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const { uploadId } = await start()
    await sendPart(uploadId, 2, TAIL_BYTES)

    await expect(start()).resolves.toStrictEqual({ partBytes: VIDEO_UPLOAD_PART_BYTES, parts: [2], uploadId })
  })

  it("replaces an unfinished upload of another file and aborts its parts", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const first = await start()

    const second = await start({ lastModified: LAST_MODIFIED + 1 })

    expect(second.uploadId).not.toBe(first.uploadId)
    await expect(uploadRow(first.uploadId)).resolves.toBeUndefined()
    await expect(sendPart(first.uploadId, 1, VIDEO_UPLOAD_PART_BYTES)).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("replaces an upload waiting for the encoder and deletes its source", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const uploadId = await uploadWhole()
    await expect(env.MEDIA.head(sourceKey(uploadId))).resolves.not.toBeNull()

    await start()

    await expect(uploadRow(uploadId)).resolves.toBeUndefined()
    await expect(env.MEDIA.head(sourceKey(uploadId))).resolves.toBeNull()
  })

  it("refuses a lesson without a video", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await makeTextLesson(LESSON_IDS.PAID_WITHOUT_VIDEO)

    await expect(start()).rejects.toThrow(ERROR_CODES.CONFLICT)
  })

  it.each([
    { input: { fileName: "notes.pdf" }, name: "a file that is not a recording" },
    { input: { sizeBytes: VIDEO_UPLOAD_MAX_BYTES + 1 }, name: "a recording over the size limit" },
    { input: { fileName: " " }, name: "a file without a name" },
  ])("refuses $name", async ({ input }) => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(start(input)).rejects.toThrow(ERROR_CODES.VALIDATION)
  })

  it("rejects a missing lesson", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(start({ lessonId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("limits how often one address starts an upload", async () => {
    signInAs(ROLE_CODES.ADMIN)
    for (let count = 0; count < VIDEO_UPLOADS_PER_MINUTE; count++) {
      await start()
    }

    await expect(start()).rejects.toThrow(ERROR_CODES.TOO_MANY_REQUESTS)
  })

  it("requires the course update permission", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(start()).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("uploadVideoPart", () => {
  it("stores each part in R2 and records its etag", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const { uploadId } = await start()

    await expect(sendPart(uploadId, 1, VIDEO_UPLOAD_PART_BYTES)).resolves.toStrictEqual({ partNumber: 1 })

    const row = await uploadRow(uploadId)
    expect(Object.keys(row?.parts ?? {})).toStrictEqual(["1"])
  })

  it.each([
    { bytes: TAIL_BYTES, name: "a part past the end of the file", partNumber: 3 },
    { bytes: TAIL_BYTES, name: "a middle part of the wrong size", partNumber: 1 },
    { bytes: TAIL_BYTES + 1, name: "a last part of the wrong size", partNumber: 2 },
  ])("refuses $name", async ({ bytes, partNumber }) => {
    signInAs(ROLE_CODES.ADMIN)
    const { uploadId } = await start()

    await expect(sendPart(uploadId, partNumber, bytes)).rejects.toThrow(ERROR_CODES.VALIDATION)
    await expect(uploadRow(uploadId)).resolves.toMatchObject({ parts: {} })
  })

  it("refuses a part for an upload that is no longer receiving parts", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const uploadId = await uploadWhole()

    await expect(sendPart(uploadId, 2, TAIL_BYTES)).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("requires the course update permission", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(sendPart(MISSING_ID, 1, TAIL_BYTES)).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("completeVideoUpload", () => {
  it("joins the parts into the source and queues it for the encoder", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const uploadId = await uploadWhole()

    await expect(uploadRow(uploadId)).resolves.toMatchObject({ status: VIDEO_UPLOAD_STATUS.QUEUED })
    await expect(env.MEDIA.head(sourceKey(uploadId))).resolves.toMatchObject({ size: SIZE_BYTES })
  })

  it("refuses an upload that misses a part", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const { uploadId } = await start()
    await sendPart(uploadId, 1, VIDEO_UPLOAD_PART_BYTES)

    await expect(executeMutation(completeVideoUploadMutation, { uploadId })).rejects.toThrow(ERROR_CODES.VALIDATION)
    await expect(uploadRow(uploadId)).resolves.toMatchObject({ status: VIDEO_UPLOAD_STATUS.UPLOADING })
  })

  it("rejects a missing upload", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(completeVideoUploadMutation, { uploadId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})

describe("cancelVideoUpload", () => {
  it("aborts an unfinished upload and forgets it", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const { uploadId } = await start()
    const row = await uploadRow(uploadId)

    await expect(executeMutation(cancelVideoUploadMutation, { uploadId })).resolves.toStrictEqual({ uploadId })

    await expect(uploadRow(uploadId)).resolves.toBeUndefined()
    await expect(env.MEDIA.resumeMultipartUpload(sourceKey(uploadId), row?.multipartId ?? "").uploadPart(1, "take")).rejects.toThrow(
      "NoSuchUpload",
    )
  })

  it("deletes the source of an upload waiting for the encoder", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const uploadId = await uploadWhole()

    await executeMutation(cancelVideoUploadMutation, { uploadId })

    await expect(env.MEDIA.head(sourceKey(uploadId))).resolves.toBeNull()
  })

  it("forgets an upload whose parts R2 already discarded", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const warn = vi.spyOn(console, "warn").mockReturnValue()
    const { uploadId } = await start()
    const row = await uploadRow(uploadId)
    await env.MEDIA.resumeMultipartUpload(sourceKey(uploadId), row?.multipartId ?? "").abort()

    await executeMutation(cancelVideoUploadMutation, { uploadId })

    await expect(uploadRow(uploadId)).resolves.toBeUndefined()
    expect(warn).toHaveBeenCalledOnce()
  })

  it("rejects a missing upload", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(cancelVideoUploadMutation, { uploadId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})

describe("retryVideoUpload", () => {
  it("queues a failed upload for the encoder again", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const uploadId = await uploadWhole()
    await db
      .update(videoUpload)
      .set({ failure: VIDEO_UPLOAD_FAILURE.ENCODING, status: VIDEO_UPLOAD_STATUS.FAILED })
      .where(eq(videoUpload.id, uploadId))

    await expect(executeMutation(retryVideoUploadMutation, { uploadId })).resolves.toStrictEqual({ uploadId })

    await expect(uploadRow(uploadId)).resolves.toMatchObject({ failure: null, status: VIDEO_UPLOAD_STATUS.QUEUED })
  })

  it("rejects an upload that has not failed", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const uploadId = await uploadWhole()

    await expect(executeMutation(retryVideoUploadMutation, { uploadId })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})

describe("deleting what an upload belongs to", () => {
  it.each([
    { name: "its lesson", remove: () => executeMutation(deleteLessonMutation, { lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO }) },
    { name: "its chapter", remove: () => executeMutation(deleteChapterMutation, { chapterId: IDS.CHAPTER_TWO }) },
    { name: "its course", remove: () => executeMutation(deleteCoursesMutation, { courseIds: [IDS.COURSE] }) },
  ])("removes the upload and its source with $name", async ({ remove }) => {
    signInAs(ROLE_CODES.ADMIN)
    const uploadId = await uploadWhole()

    await remove()

    await expect(uploadRow(uploadId)).resolves.toBeUndefined()
    await expect(env.MEDIA.head(sourceKey(uploadId))).resolves.toBeNull()
  })
})
