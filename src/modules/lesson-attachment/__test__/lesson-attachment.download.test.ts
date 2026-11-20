import { describe, expect, it } from "vite-plus/test"

import {
  LESSON_ATTACHMENT_DOWNLOAD_TTL_SECONDS,
  LESSON_ATTACHMENT_PATH_PREFIX,
} from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { SIGNED_DOWNLOAD_PATH, signDownload, verifyDownload } from "~/src/modules/lesson-attachment/lesson-attachment.download"
import { attachmentObjectKey } from "~/src/modules/lesson-attachment/lesson-attachment.files"

const SECRET = "a-test-secret-that-is-long-enough"
const ATTACHMENT_ID = "0195a2b4-6c8d-7e9f-8a0b-00000000a0a1"
const FILE_NAME = "slides.pdf"
const NOW = Date.parse("2026-11-17T10:20:00.000Z")

const signed = async (now = NOW) => {
  const path = await signDownload({
    attachmentId: ATTACHMENT_ID,
    now,
    objectKey: attachmentObjectKey({ attachmentId: ATTACHMENT_ID, fileName: FILE_NAME }),
    secret: SECRET,
  })
  const groups = SIGNED_DOWNLOAD_PATH.exec(`https://saasyland.test${path}`)?.pathname.groups

  return { expires: groups?.["expires"] ?? "", path, signature: groups?.["signature"] ?? "" }
}

describe("attachment downloads", () => {
  it("signs a path to the file under the downloads prefix", async () => {
    const { path } = await signed()

    expect(path).toMatch(new RegExp(`^${LESSON_ATTACHMENT_PATH_PREFIX}/[\\da-z]+\\.[\\da-f]{64}/${ATTACHMENT_ID}/${FILE_NAME}$`, "u"))
  })

  it("expires at least the time to live later and accepts its own signature until then", async () => {
    const { expires, signature } = await signed()
    const expiresAt = Number.parseInt(expires, 36) * 1000
    const claim = { attachmentId: ATTACHMENT_ID, expires, fileName: FILE_NAME, secret: SECRET, signature }

    expect(expiresAt).toBeGreaterThanOrEqual(NOW + LESSON_ATTACHMENT_DOWNLOAD_TTL_SECONDS * 1000)
    await expect(verifyDownload({ ...claim, now: expiresAt - 1 })).resolves.toBe(true)
    await expect(verifyDownload({ ...claim, now: expiresAt })).resolves.toBe(false)
  })

  it("rejects another file, another attachment or another secret", async () => {
    const { expires, signature } = await signed()
    const claim = { attachmentId: ATTACHMENT_ID, expires, fileName: FILE_NAME, now: NOW, secret: SECRET, signature }

    await expect(verifyDownload({ ...claim, fileName: "other.pdf" })).resolves.toBe(false)
    await expect(verifyDownload({ ...claim, attachmentId: "0195a2b4-6c8d-7e9f-8a0b-00000000a0a2" })).resolves.toBe(false)
    await expect(verifyDownload({ ...claim, secret: "another-secret" })).resolves.toBe(false)
  })
})
