import { env } from "cloudflare:workers"

import { expect, it, vi } from "vite-plus/test"

import { createEdgeCache } from "~/src/platform/testing/mocks/cache"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_COVER_PATH_PREFIX } from "~/src/modules/course/course.cover"
import { LESSON_ATTACHMENT_PATH_PREFIX } from "~/src/modules/lesson-attachment/lesson-attachment.constants"
import { MEDIA_PATH_PREFIX } from "~/src/modules/video/video.constants"

import { COURSES_WORKER_HANDLERS } from "~/src/data/courses.worker"

import worker from "~/src/server"

const fetchHandler = vi.hoisted(() => vi.fn<(request: Request) => Promise<Response>>())
vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch: fetchHandler } }))

it("claims every path under the media prefix, downloads and covers included", () => {
  expect(COURSES_WORKER_HANDLERS.map(({ pathPrefix }) => pathPrefix)).toStrictEqual([`${MEDIA_PATH_PREFIX}/`])
  expect(LESSON_ATTACHMENT_PATH_PREFIX.startsWith(`${MEDIA_PATH_PREFIX}/`)).toBe(true)
  expect(COURSE_COVER_PATH_PREFIX.startsWith(`${MEDIA_PATH_PREFIX}/`)).toBe(true)
})

it("serves a course cover without the locale middleware or TanStack Start", async () => {
  createEdgeCache()
  const cover = "covers/0195a2b4-6c8d-7e9f-8a0b-00000000c0c0/0195a2b4-6c8d-7e9f-8a0b-00000000c0e1.webp"
  await env.MEDIA.put(cover, "RIFF")

  const response = await worker.fetch(
    new Request(`https://localhost${MEDIA_PATH_PREFIX}/${cover}`, { headers: { cookie: `${I18N.COOKIE_NAME}=pl-PL` } }),
    env,
  )

  expect(response.status).toBe(200)
  expect(await response.text()).toBe("RIFF")
  expect(response.headers.get("content-type")).toBe("image/webp")
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  expect(fetchHandler).not.toHaveBeenCalled()
})

it("streams signed media without the locale middleware or TanStack Start", async () => {
  createEdgeCache()
  const { createPlayback } = await import("~/src/modules/video/video.playback")
  const videoId = "0195a2b4-6c8d-7e9f-8a0b-1c2d3e4f5a6b"
  await env.MEDIA.put(`videos/${videoId}/master.m3u8`, "#EXTM3U\n")
  const { src } = await createPlayback({ now: Date.now(), secret: env.AUTH_SECRET, video: { captionLocales: [], id: videoId } })

  const response = await worker.fetch(new Request(`https://localhost${src}`, { headers: { cookie: `${I18N.COOKIE_NAME}=pl-PL` } }), env)

  expect(response.status).toBe(200)
  expect(await response.text()).toBe("#EXTM3U\n")
  expect(response.headers.get("set-cookie")).toBeNull()
  expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  expect(fetchHandler).not.toHaveBeenCalled()
})

it("serves a signed download without the locale middleware or TanStack Start", async () => {
  const { signDownload } = await import("~/src/modules/lesson-attachment/lesson-attachment.download")
  const { attachmentObjectKey } = await import("~/src/modules/lesson-attachment/lesson-attachment.files")
  const attachmentId = "0195a2b4-6c8d-7e9f-8a0b-00000000a0a1"
  const objectKey = attachmentObjectKey({ attachmentId, fileName: "notes.md" })
  await env.MEDIA.put(objectKey, "# Notes\n")
  const path = await signDownload({ attachmentId, now: Date.now(), objectKey, secret: env.AUTH_SECRET })

  const response = await worker.fetch(new Request(`https://localhost${path}`, { headers: { cookie: `${I18N.COOKIE_NAME}=pl-PL` } }), env)

  expect(response.status).toBe(200)
  expect(await response.text()).toBe("# Notes\n")
  expect(response.headers.get("content-disposition")).toBe('attachment; filename="notes.md"')
  expect(response.headers.get("x-content-type-options")).toBe("nosniff")
  expect(fetchHandler).not.toHaveBeenCalled()
})
