import { env } from "cloudflare:workers"

import { asc, eq } from "drizzle-orm"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { deleteChapterMutation } from "~/src/modules/chapter/use-cases/delete-chapter"
import { IDS, LESSON_IDS, USERS, seedCatalogue } from "~/src/modules/course/__test__/fixtures/catalogue"
import { deleteCoursesMutation } from "~/src/modules/course/use-cases/delete-courses"
import {
  LESSON_ATTACHMENT_FILE_TYPES,
  LESSON_ATTACHMENT_KIND,
  LESSON_ATTACHMENT_UPLOADS_PER_MINUTE,
} from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { attachmentObjectKey, uploadFormData } from "~/src/modules/lesson-attachment/lesson-attachment.files"
import { lessonAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.schema"
import { createLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/create-lesson-attachment"
import { deleteLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/delete-lesson-attachment"
import { moveLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/move-lesson-attachment"
import { updateLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/update-lesson-attachment"
import { uploadLessonAttachmentMutation } from "~/src/modules/lesson-attachment/use-cases/upload-lesson-attachment"
import { deleteLessonMutation } from "~/src/modules/lesson/use-cases/delete-lesson"

const MISSING_ID = "01960000-0000-7000-8000-00000000dead"
const TITLE = { "en-US": "Slides", "pl-PL": "Slajdy" }
const PDF = "%PDF-1.7"

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role, userId: USERS.VISITOR }))
}

const upload = (lessonId: string, name = "Lesson slides.pdf") =>
  executeMutation(uploadLessonAttachmentMutation, uploadFormData({ file: new File([PDF], name), lessonId, title: TITLE }))

const addLink = (lessonId: string, url = "/docs/features/courses") =>
  executeMutation(createLessonAttachmentMutation, { lessonId, title: { "en-US": "Docs" }, url })

const attachmentRow = async (attachmentId: string) => {
  const [row] = await db.select().from(lessonAttachment).where(eq(lessonAttachment.id, attachmentId))
  return row
}

const storedText = async (key: string): Promise<string | null> => {
  const object = await env.MEDIA.get(key)
  return object && new Response(object.body).text()
}

const attachmentOrder = async (lessonId: string): Promise<string[]> => {
  const rows = await db
    .select({ id: lessonAttachment.id })
    .from(lessonAttachment)
    .where(eq(lessonAttachment.lessonId, lessonId))
    .orderBy(asc(lessonAttachment.position))
  return rows.map(({ id }) => id)
}

beforeEach(async () => {
  await seedCatalogue()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("uploadLessonAttachment", () => {
  it("stores the file in R2 under the attachments prefix and records it after the lesson's other materials", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await addLink(LESSON_IDS.PAID)

    const { id } = await upload(LESSON_IDS.PAID)
    const objectKey = attachmentObjectKey({ attachmentId: id, fileName: "Lesson-slides.pdf" })

    await expect(attachmentRow(id)).resolves.toMatchObject({
      contentType: LESSON_ATTACHMENT_FILE_TYPES.pdf,
      kind: LESSON_ATTACHMENT_KIND.FILE,
      lessonId: LESSON_IDS.PAID,
      objectKey,
      position: 2,
      sizeBytes: PDF.length,
      title: TITLE,
      url: null,
    })
    await expect(storedText(objectKey)).resolves.toBe(PDF)
  })

  it("refuses a file type it would never serve and stores nothing", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const put = vi.spyOn(env.MEDIA, "put")

    await expect(upload(LESSON_IDS.PAID, "page.html")).rejects.toThrow(ERROR_CODES.VALIDATION)
    expect(put).not.toHaveBeenCalled()
  })

  it("reports a missing lesson as not found and stores nothing", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const put = vi.spyOn(env.MEDIA, "put")

    await expect(upload(MISSING_ID)).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    expect(put).not.toHaveBeenCalled()
  })

  it("keeps no record when the file cannot be stored", async () => {
    signInAs(ROLE_CODES.ADMIN)
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(env.MEDIA, "put").mockRejectedValueOnce(new Error("R2 is unavailable"))

    await expect(upload(LESSON_IDS.PAID)).rejects.toThrow(ERROR_CODES.INTERNAL_ERROR)
    expect(await attachmentOrder(LESSON_IDS.PAID)).toStrictEqual([])
  })

  it("limits how often one address uploads", async () => {
    signInAs(ROLE_CODES.ADMIN)
    for (let count = 0; count < LESSON_ATTACHMENT_UPLOADS_PER_MINUTE; count++) {
      await upload(LESSON_IDS.PAID)
    }

    await expect(upload(LESSON_IDS.PAID)).rejects.toThrow(ERROR_CODES.TOO_MANY_REQUESTS)
  })

  it("requires the course update permission", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(upload(LESSON_IDS.PAID)).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("createLessonAttachment", () => {
  it("adds a link to a docs page or an https address", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const { id } = await addLink(LESSON_IDS.PREVIEW, "https://github.com/saasyland/cli")

    await expect(attachmentRow(id)).resolves.toMatchObject({
      contentType: null,
      kind: LESSON_ATTACHMENT_KIND.LINK,
      objectKey: null,
      position: 1,
      sizeBytes: null,
      url: "https://github.com/saasyland/cli",
    })
  })

  it("refuses another scheme and a missing lesson", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(addLink(LESSON_IDS.PREVIEW, "http://example.com")).rejects.toThrow(ERROR_CODES.VALIDATION)
    await expect(addLink(MISSING_ID)).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })
})

describe("updateLessonAttachment", () => {
  it("renames a file and changes a link's address", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const file = await upload(LESSON_IDS.PAID)
    const link = await addLink(LESSON_IDS.PAID)

    await executeMutation(updateLessonAttachmentMutation, { attachmentId: file.id, title: { "en-US": "Deck" } })
    await executeMutation(updateLessonAttachmentMutation, { attachmentId: link.id, title: { "en-US": "Guide" }, url: "/docs" })

    await expect(attachmentRow(file.id)).resolves.toMatchObject({ title: { "en-US": "Deck" }, url: null })
    await expect(attachmentRow(link.id)).resolves.toMatchObject({ title: { "en-US": "Guide" }, url: "/docs" })
  })

  it("refuses an address for a file and reports a missing attachment", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const file = await upload(LESSON_IDS.PAID)

    await expect(executeMutation(updateLessonAttachmentMutation, { attachmentId: file.id, title: TITLE, url: "/docs" })).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )
    await expect(executeMutation(updateLessonAttachmentMutation, { attachmentId: MISSING_ID, title: TITLE })).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )
  })
})

describe("moveLessonAttachment", () => {
  it("moves a material to any place among its lesson's materials and keeps one already in its place", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const first = await addLink(LESSON_IDS.PAID)
    const second = await upload(LESSON_IDS.PAID)
    const third = await addLink(LESSON_IDS.PAID)

    await executeMutation(moveLessonAttachmentMutation, { attachmentId: third.id, position: 1 })
    expect(await attachmentOrder(LESSON_IDS.PAID)).toStrictEqual([third.id, first.id, second.id])

    await executeMutation(moveLessonAttachmentMutation, { attachmentId: third.id, position: 1 })
    expect(await attachmentOrder(LESSON_IDS.PAID)).toStrictEqual([third.id, first.id, second.id])
  })

  it("reports a missing attachment", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(moveLessonAttachmentMutation, { attachmentId: MISSING_ID, position: 1 })).rejects.toThrow(
      ERROR_CODES.NOT_FOUND,
    )
  })
})

describe("deleting materials", () => {
  it("deletes a file's record and its object, and a link's record", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const file = await upload(LESSON_IDS.PAID)
    const link = await addLink(LESSON_IDS.PAID)
    const objectKey = attachmentObjectKey({ attachmentId: file.id, fileName: "Lesson-slides.pdf" })

    await executeMutation(deleteLessonAttachmentMutation, { attachmentId: file.id })
    await executeMutation(deleteLessonAttachmentMutation, { attachmentId: link.id })

    await expect(attachmentRow(file.id)).resolves.toBeUndefined()
    await expect(attachmentRow(link.id)).resolves.toBeUndefined()
    await expect(storedText(objectKey)).resolves.toBeNull()
    await expect(executeMutation(deleteLessonAttachmentMutation, { attachmentId: file.id })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it.each([
    { name: "lesson", remove: () => executeMutation(deleteLessonMutation, { lessonId: LESSON_IDS.PAID }) },
    { name: "chapter", remove: () => executeMutation(deleteChapterMutation, { chapterId: IDS.CHAPTER_TWO }) },
    { name: "course", remove: () => executeMutation(deleteCoursesMutation, { courseIds: [IDS.COURSE] }) },
  ])("deletes the uploaded files of a deleted $name and keeps the others", async ({ remove }) => {
    signInAs(ROLE_CODES.ADMIN)
    const doomed = await upload(LESSON_IDS.PAID)
    await addLink(LESSON_IDS.PAID)
    const other = await executeMutation(
      uploadLessonAttachmentMutation,
      uploadFormData({ file: new File([PDF], "other.pdf"), lessonId: LESSON_IDS.PREVIEW, title: TITLE }),
    )

    await remove()

    await expect(storedText(attachmentObjectKey({ attachmentId: doomed.id, fileName: "Lesson-slides.pdf" }))).resolves.toBeNull()
    await expect(attachmentRow(doomed.id)).resolves.toBeUndefined()
    const survivor = await storedText(attachmentObjectKey({ attachmentId: other.id, fileName: "other.pdf" }))
    expect(survivor === null).toBe((await attachmentRow(other.id)) === undefined)
  })
})
