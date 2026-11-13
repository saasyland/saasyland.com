import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { describe, expect, it } from "vite-plus/test"

import { video } from "~/src/modules/video/video.schema"
import type { Video } from "~/src/modules/video/video.types"
import { videoZodSchemas } from "~/src/modules/video/video.zod"

const VIDEO_ID = "0195a2b4-6c8d-7e9f-8a0b-1c2d3e4f5a6b"

const registration = (overrides: Partial<Video["registerVideo"]> = {}): Video["registerVideo"] => ({
  captionLocales: ["en-US"],
  durationMs: 754_000,
  height: 1080,
  id: VIDEO_ID,
  sizeBytes: 120_000_000,
  title: "Lesson 01",
  width: 1920,
  ...overrides,
})

describe("video schema", () => {
  it("materializes through the drizzle adapter and stamps updates", () => {
    expect(drizzleAdapter({}, { provider: "sqlite", schema: { video } })).toBeDefined()
    expect(video.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date)
  })

  it("accepts a registration from the publishing script", () => {
    expect(videoZodSchemas.registerVideo.parse(registration({ title: "  Lesson 01  " })).title).toBe("Lesson 01")
  })

  it.each([
    { field: "title", value: " " },
    { field: "id", value: "lesson-01" },
    { field: "durationMs", value: 0 },
    { field: "width", value: 1.5 },
    { field: "captionLocales", value: ["en-GB"] },
  ])("rejects a registration with an invalid $field", ({ field, value }) => {
    expect(videoZodSchemas.registerVideo.safeParse({ ...registration(), [field]: value }).success).toBe(false)
  })

  it("validates admin inputs", () => {
    expect(videoZodSchemas.getVideos.parse({})).toStrictEqual({ pageIndex: 0, pageSize: 10 })
    expect(videoZodSchemas.deleteVideo.safeParse({ videoId: "" }).success).toBe(false)
    expect(videoZodSchemas.getVideoPlayback.safeParse({ videoId: VIDEO_ID }).success).toBe(true)
    expect(videoZodSchemas.select.safeParse({}).success).toBe(false)
    expect(videoZodSchemas.insert.safeParse(registration()).success).toBe(true)
  })
})
