import { env } from "cloudflare:workers"

import { asc, eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { IDS, LESSON_IDS, USERS, recordProgress, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { lessonProgress } from "~/src/modules/lesson-progress/lesson-progress.schema"
import { LESSON_ACCESS, LESSON_FORMAT, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import { lesson } from "~/src/modules/lesson/lesson.schema"
import { createLessonMutation } from "~/src/modules/lesson/use-cases/create-lesson"
import { deleteLessonMutation } from "~/src/modules/lesson/use-cases/delete-lesson"
import { removeLessonVideoMutation } from "~/src/modules/lesson/use-cases/remove-lesson-video"
import { replaceLessonVideoMutation } from "~/src/modules/lesson/use-cases/replace-lesson-video"
import { setLessonFormatMutation } from "~/src/modules/lesson/use-cases/set-lesson-format"
import { updateLessonMutation } from "~/src/modules/lesson/use-cases/update-lesson"
import { VIDEO_UPLOAD_PART_BYTES } from "~/src/modules/video-upload/video-upload.constants"
import { videoUpload } from "~/src/modules/video-upload/video-upload.schema"
import { VIDEO_FILES } from "~/src/modules/video/video.constants"
import { videoDirectory, videoObjectKey } from "~/src/modules/video/video.files"
import { video } from "~/src/modules/video/video.schema"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"

const EDITABLE = {
  access: LESSON_ACCESS.ACCOUNT,
  slug: "webhooks",
  status: LESSON_STATUS.PUBLISHED,
  summary: { "en-US": "Webhooks." },
  title: { "en-US": "Webhooks", "pl-PL": "Webhooki" },
}

const FIELDS = { ...EDITABLE, format: LESSON_FORMAT.VIDEO }

const CONTENT = {
  ...EDITABLE,
  description: { "en-US": "Run `bun run dev`.\n\nThen open the site.", "pl-PL": "Uruchom `bun run dev`." },
  keyMoments: [
    { at: "1:02:03", label: { "en-US": "Deploy", "pl-PL": "Wdrożenie" } },
    { at: "1:15", label: { "en-US": "Install" } },
  ],
}

const UPLOAD_ROW = {
  contentType: "video/mp4",
  fileName: "take.mp4",
  id: "01960000-0000-7000-8000-00000000e001",
  lastModified: 1,
  lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO,
  multipartId: "multipart",
  objectKey: "uploads/01960000-0000-7000-8000-00000000e001/source.mp4",
  partBytes: VIDEO_UPLOAD_PART_BYTES,
  sizeBytes: 1,
}

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

const lessonRow = async (lessonId: string) => {
  const [row] = await db.select().from(lesson).where(eq(lesson.id, lessonId))
  return row
}

const lessonOrder = async (chapterId: string): Promise<string[]> => {
  const rows = await db.select({ id: lesson.id }).from(lesson).where(eq(lesson.chapterId, chapterId)).orderBy(asc(lesson.position))
  return rows.map(({ id }) => id)
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("createLesson", () => {
  it("adds the lesson at the end of its chapter, in the chapter's course", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const { id } = await executeMutation(createLessonMutation, { ...FIELDS, chapterId: IDS.CHAPTER_ONE })

    await expect(lessonRow(id)).resolves.toMatchObject({
      ...FIELDS,
      chapterId: IDS.CHAPTER_ONE,
      courseId: IDS.COURSE,
      position: 3,
      videoId: null,
    })
  })

  it("creates a text lesson", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const { id } = await executeMutation(createLessonMutation, { ...FIELDS, chapterId: IDS.CHAPTER_TWO, format: LESSON_FORMAT.TEXT })

    await expect(lessonRow(id)).resolves.toMatchObject({ format: LESSON_FORMAT.TEXT, position: 4, videoId: null })
  })

  it("refuses a slug another lesson of the course uses", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(createLessonMutation, { ...FIELDS, chapterId: IDS.CHAPTER_ONE, slug: "billing" })).rejects.toThrow(
      ERROR_CODES.CONFLICT,
    )
  })

  it("rejects a missing chapter", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(createLessonMutation, { ...FIELDS, chapterId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(createLessonMutation, { ...FIELDS, chapterId: IDS.CHAPTER_ONE })).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("updateLesson", () => {
  it("saves the fields, the description and the key moments in time order, and keeps the video", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(updateLessonMutation, { ...CONTENT, lessonId: LESSON_IDS.PAID })

    await expect(lessonRow(LESSON_IDS.PAID)).resolves.toMatchObject({
      ...FIELDS,
      description: CONTENT.description,
      keyMoments: [
        { label: { "en-US": "Install" }, seconds: 75 },
        { label: { "en-US": "Deploy", "pl-PL": "Wdrożenie" }, seconds: 3723 },
      ],
      videoId: IDS.VIDEO,
    })
  })

  it("refuses a slug another lesson of the course uses", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(updateLessonMutation, { ...CONTENT, lessonId: LESSON_IDS.PAID, slug: "sessions" })).rejects.toThrow(
      ERROR_CODES.CONFLICT,
    )
  })

  it("rejects a missing lesson", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(updateLessonMutation, { ...CONTENT, lessonId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})

describe("replaceLessonVideo", () => {
  it("puts another video on the lesson in one step", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await executeMutation(replaceLessonVideoMutation, { lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO, videoId: IDS.SPARE_VIDEO })
    await expect(lessonRow(LESSON_IDS.PAID_WITHOUT_VIDEO)).resolves.toMatchObject({ videoId: IDS.SPARE_VIDEO })

    await executeMutation(replaceLessonVideoMutation, { lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO, videoId: IDS.VIDEO })
    await expect(lessonRow(LESSON_IDS.PAID_WITHOUT_VIDEO)).resolves.toMatchObject({ videoId: IDS.VIDEO })
  })

  it.each([
    { input: { lessonId: LESSON_IDS.PAID, videoId: MISSING_ID }, name: "a missing video" },
    { input: { lessonId: MISSING_ID, videoId: IDS.VIDEO }, name: "a missing lesson" },
  ])("rejects $name", async ({ input }) => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(replaceLessonVideoMutation, input)).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    await expect(lessonRow(LESSON_IDS.PAID)).resolves.toMatchObject({ videoId: IDS.VIDEO })
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(replaceLessonVideoMutation, { lessonId: LESSON_IDS.PAID, videoId: IDS.VIDEO })).rejects.toThrow(
      ERROR_CODES.FORBIDDEN,
    )
  })
})

describe("setLessonFormat", () => {
  it("makes a lesson without a video a text lesson and back", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(
      executeMutation(setLessonFormatMutation, { format: LESSON_FORMAT.TEXT, lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO }),
    ).resolves.toStrictEqual({ format: LESSON_FORMAT.TEXT, id: LESSON_IDS.PAID_WITHOUT_VIDEO })
    await expect(lessonRow(LESSON_IDS.PAID_WITHOUT_VIDEO)).resolves.toMatchObject({ format: LESSON_FORMAT.TEXT })

    await executeMutation(setLessonFormatMutation, { format: LESSON_FORMAT.VIDEO, lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO })
    await expect(lessonRow(LESSON_IDS.PAID_WITHOUT_VIDEO)).resolves.toMatchObject({ format: LESSON_FORMAT.VIDEO })
  })

  it("refuses to drop the video of a lesson that has one or is uploading one", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await db.insert(videoUpload).values(UPLOAD_ROW)

    await expect(executeMutation(setLessonFormatMutation, { format: LESSON_FORMAT.TEXT, lessonId: LESSON_IDS.PAID })).rejects.toThrow(
      ERROR_CODES.CONFLICT,
    )
    await expect(
      executeMutation(setLessonFormatMutation, { format: LESSON_FORMAT.TEXT, lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO }),
    ).rejects.toThrow(ERROR_CODES.CONFLICT)
    await expect(lessonRow(LESSON_IDS.PAID)).resolves.toMatchObject({ format: LESSON_FORMAT.VIDEO })
  })

  it("rejects a missing lesson", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(setLessonFormatMutation, { format: LESSON_FORMAT.VIDEO, lessonId: MISSING_ID })).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )
  })

  it("is for staff only", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(setLessonFormatMutation, { format: LESSON_FORMAT.TEXT, lessonId: LESSON_IDS.PAID })).rejects.toThrow(
      ERROR_CODES.FORBIDDEN,
    )
  })
})

describe("removeLessonVideo", () => {
  it("takes a shared video off the lesson and keeps it for the others", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(removeLessonVideoMutation, { lessonId: LESSON_IDS.PAID })).resolves.toStrictEqual({
      deleted: false,
      lessonId: LESSON_IDS.PAID,
    })
    await expect(lessonRow(LESSON_IDS.PAID)).resolves.toMatchObject({ videoId: null })
    await expect(db.select({ id: video.id }).from(video).where(eq(video.id, IDS.VIDEO))).resolves.toHaveLength(1)
  })

  it("deletes a video no other lesson uses, with its files", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await executeMutation(replaceLessonVideoMutation, { lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO, videoId: IDS.SPARE_VIDEO })
    await env.MEDIA.put(videoObjectKey({ file: VIDEO_FILES.MASTER_PLAYLIST, videoId: IDS.SPARE_VIDEO }), "#EXTM3U")
    await env.MEDIA.put(videoObjectKey({ file: VIDEO_FILES.MASTER_PLAYLIST, videoId: IDS.VIDEO }), "#EXTM3U")

    await expect(executeMutation(removeLessonVideoMutation, { lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO })).resolves.toStrictEqual({
      deleted: true,
      lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO,
    })
    await expect(db.select({ id: video.id }).from(video).where(eq(video.id, IDS.SPARE_VIDEO))).resolves.toHaveLength(0)
    await expect(env.MEDIA.list({ prefix: videoDirectory(IDS.SPARE_VIDEO) })).resolves.toMatchObject({ objects: [] })
    await expect(env.MEDIA.list({ prefix: videoDirectory(IDS.VIDEO) })).resolves.toMatchObject({ objects: [{}] })
  })

  it.each([
    { lessonId: LESSON_IDS.PAID_WITHOUT_VIDEO, name: "a lesson without a video" },
    { lessonId: MISSING_ID, name: "a missing lesson" },
  ])("rejects $name", async ({ lessonId }) => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(removeLessonVideoMutation, { lessonId })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("needs the video delete permission", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(removeLessonVideoMutation, { lessonId: LESSON_IDS.PAID })).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("deleteLesson", () => {
  it("removes the lesson and the progress in it", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await recordProgress({ lessonId: LESSON_IDS.ACCOUNT, positionMs: 1000, userId: USERS.ENTITLED })

    await executeMutation(deleteLessonMutation, { lessonId: LESSON_IDS.ACCOUNT })

    await expect(lessonOrder(IDS.CHAPTER_ONE)).resolves.toStrictEqual([LESSON_IDS.PREVIEW])
    await expect(db.select().from(lessonProgress)).resolves.toHaveLength(0)
  })

  it("rejects a missing lesson", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(deleteLessonMutation, { lessonId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})
