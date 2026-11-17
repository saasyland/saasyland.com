import { describe, expect, it } from "vite-plus/test"

import {
  LESSON_ATTACHMENT_FILE_TYPES,
  LESSON_ATTACHMENT_MAX_BYTES,
  LESSON_ATTACHMENT_URL_MAX_LENGTH,
} from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { uploadFormData } from "~/src/modules/lesson-attachment/lesson-attachment.files"
import { lessonAttachmentZodSchemas } from "~/src/modules/lesson-attachment/lesson-attachment.zod"

const LESSON_ID = "0195a2b4-6c8d-7e9f-8a0b-00000000c001"
const TITLE = { "en-US": "Slides" }

const firstMessage = (result: { error?: { issues: readonly { message: string }[] } | undefined }) => result.error?.issues[0]?.message

describe("link attachments", () => {
  it.each(["/docs", "/docs/getting-started", "/docs/features/courses#data-model", "https://github.com/saasyland/cli"])(
    "accepts %s",
    (url) => {
      expect(lessonAttachmentZodSchemas.createLessonAttachment.parse({ lessonId: LESSON_ID, title: TITLE, url })).toStrictEqual({
        lessonId: LESSON_ID,
        title: TITLE,
        url,
      })
    },
  )

  it.each([
    "http://example.com",
    "ftp://example.com/notes.md",
    "/admin",
    "//evil.example",
    "/docs/../admin",
    "docs/getting-started",
    `https://example.com/${"a".repeat(LESSON_ATTACHMENT_URL_MAX_LENGTH)}`,
  ])("refuses %s", (url) => {
    expect(firstMessage(lessonAttachmentZodSchemas.createLessonAttachment.safeParse({ lessonId: LESSON_ID, title: TITLE, url }))).toBe(
      "urlInvalid",
    )
  })
})

describe("file uploads", () => {
  it("reads the file, the lesson and the title from form data and names the file safely", () => {
    const file = new File(["%PDF"], "My Slides.pdf")

    const upload = lessonAttachmentZodSchemas.uploadLessonAttachment.parse(
      uploadFormData({ file, lessonId: LESSON_ID, title: { ...TITLE, "pl-PL": "Slajdy" } }),
    )

    expect(upload.file.file).toBe(file)
    expect(upload).toStrictEqual({
      file: { contentType: LESSON_ATTACHMENT_FILE_TYPES.pdf, file, fileName: "My-Slides.pdf" },
      lessonId: LESSON_ID,
      title: { ...TITLE, "pl-PL": "Slajdy" },
    })
  })

  it.each([
    { file: new File([], "empty.pdf"), message: "fileRequired" },
    { file: new File(["x"], "page.html"), message: "fileTypeUnsupported" },
    { file: new File([new Uint8Array(LESSON_ATTACHMENT_MAX_BYTES + 1)], "huge.zip"), message: "fileTooLarge" },
  ])("refuses $file.name with $message", ({ file, message }) => {
    const form = uploadFormData({ file, lessonId: LESSON_ID, title: TITLE })

    expect(firstMessage(lessonAttachmentZodSchemas.uploadLessonAttachment.safeParse(form))).toBe(message)
  })

  it("requires a file and refuses anything but form data", () => {
    const form = new FormData()
    form.set("lessonId", LESSON_ID)
    form.set("title.en-US", "Slides")

    expect(firstMessage(lessonAttachmentZodSchemas.uploadLessonAttachment.safeParse(form))).toBe("fileRequired")
    expect(lessonAttachmentZodSchemas.uploadLessonAttachment.safeParse({ lessonId: LESSON_ID }).success).toBe(false)
  })
})
