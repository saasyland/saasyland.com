import { env } from "cloudflare:workers"

import { beforeEach, describe, expect, it } from "vite-plus/test"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"
import { LESSON_ATTACHMENT_FILE_TYPES, LESSON_ATTACHMENT_PATH_PREFIX } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { serveAttachment } from "~/src/modules/lesson-attachment/lesson-attachment.delivery"
import { signDownload } from "~/src/modules/lesson-attachment/lesson-attachment.download"
import { attachmentObjectKey } from "~/src/modules/lesson-attachment/lesson-attachment.files"

const ATTACHMENT_ID = "0195a2b4-6c8d-7e9f-8a0b-00000000a0a1"
const FILE_NAME = "slides.pdf"
const CONTENT = "%PDF-1.7"
const ORIGIN = "https://saasyland.test"
const FORGED_SIGNATURE = "0".repeat(64)

const signedUrl = async ({ fileName = FILE_NAME, now = Date.now() }: { fileName?: string; now?: number } = {}): Promise<string> => {
  const path = await signDownload({
    attachmentId: ATTACHMENT_ID,
    now,
    objectKey: attachmentObjectKey({ attachmentId: ATTACHMENT_ID, fileName }),
    secret: env.AUTH_SECRET,
  })
  return `${ORIGIN}${path}`
}

beforeEach(async () => {
  await env.MEDIA.put(attachmentObjectKey({ attachmentId: ATTACHMENT_ID, fileName: FILE_NAME }), CONTENT)
})

describe("serveAttachment", () => {
  it("downloads a signed file as an attachment with its content type", async () => {
    const response = await serveAttachment(new Request(await signedUrl()))

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(await response.text()).toBe(CONTENT)
    expect(Object.fromEntries(response.headers)).toMatchObject({
      "cache-control": "private, no-store",
      "content-disposition": `attachment; filename="${FILE_NAME}"`,
      "content-length": String(CONTENT.length),
      "content-type": LESSON_ATTACHMENT_FILE_TYPES.pdf,
    })
  })

  it("answers HEAD with the headers only", async () => {
    const response = await serveAttachment(new Request(await signedUrl(), { method: "HEAD" }))

    expect(response.status).toBe(HTTP_STATUS.OK)
    expect(response.headers.get("content-length")).toBe(String(CONTENT.length))
    expect(await response.text()).toBe("")
  })

  it.each(["GET", "HEAD"])("answers %s for a file that is gone with not found", async (method) => {
    await env.MEDIA.delete(attachmentObjectKey({ attachmentId: ATTACHMENT_ID, fileName: FILE_NAME }))

    const response = await serveAttachment(new Request(await signedUrl(), { method }))

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it("refuses a forged or expired signature", async () => {
    const signed = await signedUrl()
    const forged = signed.replace(/\.[\da-f]{64}\//u, `.${FORGED_SIGNATURE}/`)
    const expired = await signedUrl({ now: Date.now() - 86_400_000 })

    const forgedResponse = await serveAttachment(new Request(forged))
    const expiredResponse = await serveAttachment(new Request(expired))

    expect(forgedResponse.status).toBe(HTTP_STATUS.FORBIDDEN)
    expect(expiredResponse.status).toBe(HTTP_STATUS.FORBIDDEN)
  })

  it.each([
    `${LESSON_ATTACHMENT_PATH_PREFIX}/zz.${FORGED_SIGNATURE}/${ATTACHMENT_ID}`,
    `${LESSON_ATTACHMENT_PATH_PREFIX}/zz/${ATTACHMENT_ID}/${FILE_NAME}`,
  ])("does not find a malformed path %s", async (path) => {
    const response = await serveAttachment(new Request(`${ORIGIN}${path}`))

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it("does not find a file type that is never served", async () => {
    const response = await serveAttachment(new Request(await signedUrl({ fileName: "page.html" })))

    expect(response.status).toBe(HTTP_STATUS.NOT_FOUND)
  })

  it("accepts only GET and HEAD", async () => {
    const response = await serveAttachment(new Request(await signedUrl(), { method: "POST" }))

    expect(response.status).toBe(HTTP_STATUS.METHOD_NOT_ALLOWED)
    expect(response.headers.get("allow")).toBe("GET, HEAD")
  })
})
