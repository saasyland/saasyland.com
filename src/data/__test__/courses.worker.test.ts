import { env } from "cloudflare:workers"

import { expect, it, vi } from "vite-plus/test"

import { createEdgeCache } from "~/src/platform/testing/mocks/cache"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { MEDIA_PATH_PREFIX } from "~/src/modules/video/video.constants"

import { COURSES_WORKER_HANDLERS } from "~/src/data/courses.worker"

import worker from "~/src/server"

const fetchHandler = vi.hoisted(() => vi.fn<(request: Request) => Promise<Response>>())
vi.mock("@tanstack/react-start/server-entry", () => ({ default: { fetch: fetchHandler } }))

it("claims every path under the media prefix", () => {
  expect(COURSES_WORKER_HANDLERS.map(({ pathPrefix }) => pathPrefix)).toStrictEqual([`${MEDIA_PATH_PREFIX}/`])
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
