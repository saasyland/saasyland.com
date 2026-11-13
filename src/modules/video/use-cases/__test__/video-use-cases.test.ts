import { env } from "cloudflare:workers"

import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { executeMutation, executeQuery } from "~/src/platform/testing/lib/query"

import { createAuthSessionFixture } from "~/src/integrations/better-auth/__test__/fixtures/auth.session.fixture"
import { ROLE_CODES } from "~/src/integrations/better-auth/auth.access"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { deleteVideoMutation } from "~/src/modules/video/use-cases/delete-video"
import { videoPlaybackQuery } from "~/src/modules/video/use-cases/get-video-playback"
import { getVideosPageQuery, getVideosQuery } from "~/src/modules/video/use-cases/get-videos"
import { videoObjectKey } from "~/src/modules/video/video.files"
import { video } from "~/src/modules/video/video.schema"
import type { Video } from "~/src/modules/video/video.types"

const FIRST_ID = "0195a2b4-6c8d-7e9f-8a0b-000000000001"
const SECOND_ID = "0195a2b4-6c8d-7e9f-8a0b-000000000002"
const MISSING_ID = "0195a2b4-6c8d-7e9f-8a0b-000000000009"

const row = (id: string, createdAt: string, overrides: Partial<Video["insert"]> = {}): Video["insert"] => ({
  captionLocales: [],
  createdAt: new Date(createdAt),
  durationMs: 754_000,
  height: 1080,
  id,
  sizeBytes: 120_000_000,
  title: `Lesson ${id.slice(-1)}`,
  width: 1920,
  ...overrides,
})

const signInAs = (role: string): void => {
  vi.spyOn(auth.api, "getSession").mockResolvedValue(createAuthSessionFixture({ role }))
}

beforeEach(async () => {
  await db.delete(video)
  await db
    .insert(video)
    .values([row(FIRST_ID, "2026-11-01T00:00:00Z"), row(SECOND_ID, "2026-11-02T00:00:00Z", { captionLocales: ["en-US"] })])
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe("getVideos", () => {
  it("lists the newest videos first with the total", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const page = await executeQuery(getVideosQuery)

    expect(page.total).toBe(2)
    expect(page.rows.map(({ id }) => id)).toStrictEqual([SECOND_ID, FIRST_ID])
    expect(page.rows[0]?.captionLocales).toStrictEqual(["en-US"])
  })

  it("pages through the library", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const page = await executeQuery(getVideosPageQuery({ pageIndex: 1, pageSize: 1 }))

    expect(page).toMatchObject({ rows: [{ id: FIRST_ID }], total: 2 })
  })

  it("is closed to customers", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeQuery(getVideosQuery)).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("getVideoPlayback", () => {
  it("signs the stream, poster, storyboard and captions of a video", async () => {
    signInAs(ROLE_CODES.ADMIN)

    const playback = await executeQuery(videoPlaybackQuery({ videoId: SECOND_ID }))

    expect(playback.src).toMatch(new RegExp(`^/media/[\\da-z]+\\.[\\da-f]{64}/${SECOND_ID}/master\\.m3u8$`, "u"))
    expect(playback.captions.map(({ locale }) => locale)).toStrictEqual(["en-US"])
  })

  it("reports a video that does not exist", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeQuery(videoPlaybackQuery({ videoId: MISSING_ID }))).rejects.toThrow(ERROR_CODES.NOT_FOUND)
  })

  it("is closed to customers", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeQuery(videoPlaybackQuery({ videoId: FIRST_ID }))).rejects.toThrow(ERROR_CODES.FORBIDDEN)
  })
})

describe("deleteVideo", () => {
  const FILES = ["master.m3u8", "720p/index.m3u8", "720p/seg-00000.m4s", "poster.webp"]

  beforeEach(async () => {
    for (const file of FILES) {
      await env.MEDIA.put(videoObjectKey({ file, videoId: FIRST_ID }), file)
      await env.MEDIA.put(videoObjectKey({ file, videoId: SECOND_ID }), file)
    }
  })

  it("removes the row and every file of that video only", async () => {
    signInAs(ROLE_CODES.ADMIN)

    await expect(executeMutation(deleteVideoMutation, { videoId: FIRST_ID })).resolves.toStrictEqual({ id: FIRST_ID })

    const remaining = await db.select({ id: video.id }).from(video)
    const deleted = await env.MEDIA.list({ prefix: `videos/${FIRST_ID}/` })
    const kept = await env.MEDIA.list({ prefix: `videos/${SECOND_ID}/` })

    expect(remaining).toStrictEqual([{ id: SECOND_ID }])
    expect(deleted.objects).toStrictEqual([])
    expect(kept.objects).toHaveLength(FILES.length)
  })

  it("follows the listing cursor until every page is deleted", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const list = env.MEDIA.list.bind(env.MEDIA)
    const pages = vi.spyOn(env.MEDIA, "list").mockImplementation((options) => list({ ...options, limit: 1 }))

    await executeMutation(deleteVideoMutation, { videoId: FIRST_ID })
    const left = await list({ prefix: `videos/${FIRST_ID}/` })

    expect(left.objects).toStrictEqual([])
    expect(pages).toHaveBeenCalledTimes(FILES.length)
  })

  it("removes a row whose files are already gone", async () => {
    signInAs(ROLE_CODES.ADMIN)
    await db.insert(video).values(row(MISSING_ID, "2026-11-03T00:00:00Z"))
    const remove = vi.spyOn(env.MEDIA, "delete")

    await expect(executeMutation(deleteVideoMutation, { videoId: MISSING_ID })).resolves.toStrictEqual({ id: MISSING_ID })
    expect(remove).not.toHaveBeenCalled()
  })

  it("reports a video that does not exist without touching storage", async () => {
    signInAs(ROLE_CODES.ADMIN)
    const remove = vi.spyOn(env.MEDIA, "delete")

    await expect(executeMutation(deleteVideoMutation, { videoId: MISSING_ID })).rejects.toThrow(ERROR_CODES.NOT_FOUND)
    expect(remove).not.toHaveBeenCalled()
  })

  it("is closed to customers", async () => {
    signInAs(ROLE_CODES.CUSTOMER)

    await expect(executeMutation(deleteVideoMutation, { videoId: FIRST_ID })).rejects.toThrow(ERROR_CODES.FORBIDDEN)
    expect(await db.select({ id: video.id }).from(video)).toHaveLength(2)
  })
})
