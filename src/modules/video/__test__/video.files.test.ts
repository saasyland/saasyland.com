import { describe, expect, it } from "vite-plus/test"

import { mediaContentType, videoDirectory, videoObjectKey } from "~/src/modules/video/video.files"

const VIDEO_ID = "0195a2b4-6c8d-7e9f-8a0b-1c2d3e4f5a6b"

describe("video files", () => {
  it.each([
    ["master.m3u8", "application/vnd.apple.mpegurl"],
    ["1080p/index.m3u8", "application/vnd.apple.mpegurl"],
    ["audio/index.m3u8", "application/vnd.apple.mpegurl"],
    ["720p/init_1.mp4", "video/mp4"],
    ["720p/seg-00042.m4s", "video/iso.segment"],
    ["poster.webp", "image/webp"],
    ["poster-960.webp", "image/webp"],
    ["storyboard.webp", "image/webp"],
    ["storyboard.vtt", "text/vtt; charset=utf-8"],
    ["captions/pl-PL.vtt", "text/vtt; charset=utf-8"],
  ])("serves %s as %s", (file, contentType) => {
    expect(mediaContentType(file)).toBe(contentType)
  })

  it.each([
    "../secret",
    "720p/../../master.m3u8",
    "captions/../../poster.webp",
    "captions/english.vtt",
    "source.mp4",
    "720P/seg-1.m4s",
    "",
  ])("refuses %s", (file) => {
    expect(mediaContentType(file)).toBeUndefined()
  })

  it("keeps every file of a video under one prefix", () => {
    expect(videoDirectory(VIDEO_ID)).toBe(`videos/${VIDEO_ID}/`)
    expect(videoObjectKey({ file: "720p/seg-00001.m4s", videoId: VIDEO_ID })).toBe(`videos/${VIDEO_ID}/720p/seg-00001.m4s`)
  })
})
