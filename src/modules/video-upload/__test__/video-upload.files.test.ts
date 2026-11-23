import { describe, expect, it } from "vite-plus/test"

import { VIDEO_UPLOAD_PART_BYTES } from "~/src/modules/video-upload/video-upload.constants"
import {
  partEntries,
  partFormData,
  uploadPartCount,
  uploadPartLength,
  uploadedBytes,
  videoTitle,
  videoUploadExtension,
  videoUploadObjectKey,
} from "~/src/modules/video-upload/video-upload.files"

const SIZE_BYTES = 2 * VIDEO_UPLOAD_PART_BYTES + 5

describe("video upload files", () => {
  it.each([
    ["take.mp4", "mp4"],
    ["Screen Recording.MOV", "mov"],
    ["clip.webm", "webm"],
    ["notes.pdf", undefined],
  ])("reads the recording type of %s", (name, extension) => {
    expect(videoUploadExtension(name)).toBe(extension)
  })

  it("keeps the source of an upload under its own prefix", () => {
    expect(videoUploadObjectKey({ extension: "mov", uploadId: "upload" })).toBe("uploads/upload/source.mov")
  })

  it.each([
    ["Lesson-take.mp4", "Lesson-take"],
    ["archive.tar.mkv", "archive.tar"],
    ["mp4", "mp4"],
  ])("names the video after the file %s", (name, title) => {
    expect(videoTitle(name)).toBe(title)
  })

  it("plans parts of one size and a shorter last part", () => {
    const plan = { partBytes: VIDEO_UPLOAD_PART_BYTES, sizeBytes: SIZE_BYTES }

    expect(uploadPartCount(plan)).toBe(3)
    expect([1, 2, 3].map((partNumber) => uploadPartLength({ ...plan, partNumber }))).toStrictEqual([
      VIDEO_UPLOAD_PART_BYTES,
      VIDEO_UPLOAD_PART_BYTES,
      5,
    ])
    expect(uploadedBytes({ ...plan, parts: { "1": "a", "3": "c" } })).toBe(VIDEO_UPLOAD_PART_BYTES + 5)
    expect(uploadedBytes({ ...plan, parts: {} })).toBe(0)
  })

  it("carries a part in form data", () => {
    const part = new Blob(["take"])

    const entries = partEntries(partFormData({ part, partNumber: 2, uploadId: "upload" }))

    expect(entries).toMatchObject({ partNumber: "2", uploadId: "upload" })
    expect(entries.part).toBeInstanceOf(File)
  })
})
