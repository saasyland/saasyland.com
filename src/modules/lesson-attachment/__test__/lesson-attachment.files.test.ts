import { describe, expect, it } from "vite-plus/test"

import {
  LESSON_ATTACHMENT_FILE_NAME_MAX_LENGTH,
  LESSON_ATTACHMENT_FILE_TYPES,
  LESSON_ATTACHMENT_KEY_PREFIX,
} from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import {
  UPLOAD_FIELDS,
  attachmentContentType,
  attachmentFileName,
  attachmentFileNameOf,
  attachmentObjectKey,
  uploadEntries,
  uploadFormData,
} from "~/src/modules/lesson-attachment/lesson-attachment.files"

const ATTACHMENT_ID = "0195a2b4-6c8d-7e9f-8a0b-00000000a0a1"

describe("attachment files", () => {
  it("serves the content type of an allowed extension, in any case", () => {
    expect(attachmentContentType("Slides.PDF")).toBe(LESSON_ATTACHMENT_FILE_TYPES.pdf)
    expect(attachmentContentType("starter.zip")).toBe(LESSON_ATTACHMENT_FILE_TYPES.zip)
    expect(attachmentContentType("notes.md")).toBe(LESSON_ATTACHMENT_FILE_TYPES.md)
  })

  it.each(["page.html", "script.js", "image.svg", "no-extension", "constructor", "archive.zip.exe"])("refuses %s", (fileName) => {
    expect(attachmentContentType(fileName)).toBeUndefined()
  })

  it("keeps file names to letters, digits, dots, hyphens and underscores", () => {
    expect(attachmentFileName("Żółć – notatki (v2).pdf")).toBe("Zo-c-notatki-v2.pdf")
    expect(attachmentFileName("../../etc/passwd.txt")).toBe("etc-passwd.txt")
    expect(attachmentFileName("start_here.md")).toBe("start_here.md")
  })

  it("shortens a long file name and keeps its extension", () => {
    const name = attachmentFileName(`${"a".repeat(LESSON_ATTACHMENT_FILE_NAME_MAX_LENGTH)}.pdf`)

    expect(name).toHaveLength(LESSON_ATTACHMENT_FILE_NAME_MAX_LENGTH)
    expect(name.endsWith(".pdf")).toBe(true)
  })

  it("keys every file under the attachments prefix and reads the file name back", () => {
    const key = attachmentObjectKey({ attachmentId: ATTACHMENT_ID, fileName: "slides.pdf" })

    expect(key).toBe(`${LESSON_ATTACHMENT_KEY_PREFIX}/${ATTACHMENT_ID}/slides.pdf`)
    expect(attachmentFileNameOf(key)).toBe("slides.pdf")
  })

  it("carries an upload as form data and reads it back", () => {
    const file = new File(["%PDF"], "slides.pdf")
    const form = uploadFormData({ file, lessonId: "lesson", title: { "en-US": "Slides", "pl-PL": "Slajdy" } })

    expect(form.get(UPLOAD_FIELDS.FILE)).toBeInstanceOf(File)
    expect(uploadEntries(form, ["en-US", "pl-PL", "de-DE"])).toStrictEqual({
      file: form.get(UPLOAD_FIELDS.FILE),
      lessonId: "lesson",
      title: { "en-US": "Slides", "pl-PL": "Slajdy" },
    })
  })
})
