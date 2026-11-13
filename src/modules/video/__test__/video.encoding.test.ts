import { describe, expect, it } from "vite-plus/test"

import {
  POSTER_VARIANTS,
  type SourceVideo,
  encodeArguments,
  parseProbe,
  planRenditions,
  planStoryboard,
  posterFrameArguments,
  probeArguments,
  storyboardArguments,
  storyboardTrack,
} from "~/src/modules/video/video.encoding"

const FULL_HD: SourceVideo = { durationMs: 754_000, hasAudio: true, height: 1080, width: 1920 }
const RETINA: SourceVideo = { durationMs: 3_600_000, hasAudio: true, height: 2160, width: 3840 }
const TALL_SCREEN: SourceVideo = { durationMs: 10_000, hasAudio: false, height: 1000, width: 1600 }
const PORTRAIT: SourceVideo = { durationMs: 30_000, hasAudio: true, height: 1920, width: 1080 }
const TINY: SourceVideo = { durationMs: 1500, hasAudio: false, height: 181, width: 321 }

const valueAfter = (args: readonly string[], flag: string): string | undefined => args[args.indexOf(flag) + 1]

describe("parseProbe", () => {
  it("reads duration, size and whether there is sound", () => {
    const output = JSON.stringify({
      format: { duration: "754.0205" },
      streams: [{ codec_type: "video", height: 1080, width: 1920 }, { codec_type: "audio" }],
    })

    expect(parseProbe(output)).toStrictEqual({ durationMs: 754_021, hasAudio: true, height: 1080, width: 1920 })
  })

  it("accepts silent recordings and refuses files without a picture", () => {
    expect(
      parseProbe(JSON.stringify({ format: { duration: "2" }, streams: [{ codec_type: "video", height: 90, width: 160 }] })).hasAudio,
    ).toBe(false)
    expect(() => parseProbe(JSON.stringify({ format: { duration: "2" }, streams: [{ codec_type: "audio" }] }))).toThrow()
  })

  it("asks ffprobe for only the fields it reads", () => {
    expect(probeArguments("lesson.mp4")).toStrictEqual([
      "-v",
      "error",
      "-print_format",
      "json",
      "-show_entries",
      "format=duration:stream=codec_type,width,height",
      "lesson.mp4",
    ])
  })
})

describe("planRenditions", () => {
  it("keeps the source height on top and adds the standard steps below it", () => {
    expect(planRenditions(FULL_HD).map(({ height, name, width }) => ({ height, name, width }))).toStrictEqual([
      { height: 1080, name: "1080p", width: 1920 },
      { height: 720, name: "720p", width: 1280 },
      { height: 360, name: "360p", width: 640 },
    ])
  })

  it("caps 4K screen recordings at 1440p", () => {
    expect(planRenditions(RETINA).map(({ name }) => name)).toStrictEqual(["1440p", "1080p", "720p", "360p"])
  })

  it("skips a step that would be almost the same size as the source", () => {
    expect(planRenditions(TALL_SCREEN).map(({ name, width }) => `${name}:${String(width)}`)).toStrictEqual([
      "1000p:1600",
      "720p:1152",
      "360p:576",
    ])
    expect(planRenditions(TINY).map(({ name, width }) => `${name}:${String(width)}`)).toStrictEqual(["182p:322"])
  })

  it("caps the bitrate by pixel count and buffers twice the cap", () => {
    const [top] = planRenditions(FULL_HD)

    expect(top).toMatchObject({ bufferKbps: 9954, maxKbps: 4977 })
  })
})

describe("encodeArguments", () => {
  it("encodes every rendition and one shared audio track into fMP4 HLS", () => {
    const renditions = planRenditions(FULL_HD)
    const args = encodeArguments({ input: "in.mp4", output: "/out", renditions, source: FULL_HD })

    expect(valueAfter(args, "-filter_complex")).toBe(
      "[0:v]split=3[s0][s1][s2];[s0]scale=w=1920:h=1080:flags=lanczos[v0];[s1]scale=w=1280:h=720:flags=lanczos[v1];[s2]scale=w=640:h=360:flags=lanczos[v2]",
    )
    expect(valueAfter(args, "-var_stream_map")).toBe(
      "v:0,agroup:audio,name:1080p v:1,agroup:audio,name:720p v:2,agroup:audio,name:360p a:0,agroup:audio,name:audio,default:yes",
    )
    expect(valueAfter(args, "-maxrate:v:1")).toBe("2212k")
    expect(valueAfter(args, "-hls_segment_type")).toBe("fmp4")
    expect(valueAfter(args, "-hls_time")).toBe("6")
    expect(valueAfter(args, "-force_key_frames")).toBe("expr:gte(t,n_forced*2)")
    expect(valueAfter(args, "-b:a")).toBe("128k")
    expect(args.at(-1)).toBe("/out/%v/index.m3u8")
  })

  it("leaves out the audio group for a silent recording", () => {
    const args = encodeArguments({ input: "in.mp4", output: "/out", renditions: planRenditions(TALL_SCREEN), source: TALL_SCREEN })

    expect(args).not.toContain("-c:a")
    expect(valueAfter(args, "-var_stream_map")).toBe("v:0,name:1000p v:1,name:720p v:2,name:360p")
  })
})

describe("posters", () => {
  it("extracts a full-size frame a tenth of the way in", () => {
    expect(posterFrameArguments({ frame: "/work/poster.png", input: "in.mp4", source: FULL_HD })).toStrictEqual([
      "-hide_banner",
      "-loglevel",
      "error",
      "-y",
      "-ss",
      "75.4",
      "-i",
      "in.mp4",
      "-frames:v",
      "1",
      "/work/poster.png",
    ])
  })

  it("publishes the poster at the widths the player offers", () => {
    expect(POSTER_VARIANTS).toStrictEqual([
      { file: "poster.webp", width: 1920 },
      { file: "poster-960.webp", width: 960 },
    ])
  })
})

describe("storyboard", () => {
  it("samples every two seconds for short videos", () => {
    expect(planStoryboard(TALL_SCREEN)).toStrictEqual({
      columns: 5,
      frames: 5,
      intervalSeconds: 2,
      rows: 1,
      tileHeight: 150,
      tileWidth: 240,
    })
  })

  it("keeps an hour-long video to at most 600 frames in a fixed grid", () => {
    const storyboard = planStoryboard(RETINA)

    expect(storyboard).toStrictEqual({ columns: 10, frames: 600, intervalSeconds: 6, rows: 60, tileHeight: 136, tileWidth: 240 })
    expect(storyboard.rows * storyboard.tileHeight).toBeLessThan(16_383)
  })

  it("fits portrait video into the same box", () => {
    expect(planStoryboard(PORTRAIT)).toMatchObject({ tileHeight: 240, tileWidth: 136 })
  })

  it("tiles the frames into one sprite", () => {
    const args = storyboardArguments({ input: "in.mp4", sprite: "/work/storyboard.png", storyboard: planStoryboard(TALL_SCREEN) })

    expect(valueAfter(args, "-vf")).toBe("fps=1/2,scale=240:150,tile=5x1")
    expect(args.at(-1)).toBe("/work/storyboard.png")
  })

  it("points each cue at its tile and ends on the video's last frame", () => {
    const track = storyboardTrack({ source: { ...TALL_SCREEN, durationMs: 9500 }, storyboard: planStoryboard(TALL_SCREEN) })

    expect(track.startsWith("WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nstoryboard.webp#xywh=0,0,240,150\n\n")).toBe(true)
    expect(track.endsWith("00:00:08.000 --> 00:00:09.500\nstoryboard.webp#xywh=960,0,240,150\n")).toBe(true)
  })

  it("moves to the next row after the last column and writes hours", () => {
    const track = storyboardTrack({ source: RETINA, storyboard: planStoryboard(RETINA) })

    expect(track).toContain("00:01:00.000 --> 00:01:06.000\nstoryboard.webp#xywh=0,136,240,136")
    expect(track).toContain("00:59:54.000 --> 01:00:00.000\nstoryboard.webp#xywh=2160,8024,240,136")
  })
})
