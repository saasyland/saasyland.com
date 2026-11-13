import { fireEvent, render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import type { Video } from "~/src/modules/video/video.types"

import { VideoPlayer } from "~/src/presentation/components/custom/video-player"

const BASE = "/media/abc.0123/0195a2b4-6c8d-7e9f-8a0b-1c2d3e4f5a6b"

const PLAYBACK: Video["playback"] = {
  captions: [
    { locale: "en-US", src: `${BASE}/captions/en-US.vtt` },
    { locale: "pl-PL", src: `${BASE}/captions/pl-PL.vtt` },
  ],
  poster: `${BASE}/poster.webp`,
  posterSmall: `${BASE}/poster-960.webp`,
  src: `${BASE}/master.m3u8`,
  storyboard: `${BASE}/storyboard.vtt`,
}

const renderPlayer = (locale: "en-US" | "pl-PL") =>
  render(
    <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
      <VideoPlayer className="max-w-4xl" playback={PLAYBACK} sizes="100vw" title="Module boundaries" />
    </IntlProvider>,
  )

describe("VideoPlayer", () => {
  it("loads the storyboard for seek previews and every caption track", () => {
    const { container } = renderPlayer("en-US")
    const tracks = [...container.querySelectorAll("track")].map((track) => ({
      default: track.default,
      kind: track.kind,
      label: track.label,
      language: track.srclang,
      src: track.getAttribute("src"),
    }))

    expect(tracks).toStrictEqual([
      { default: true, kind: "metadata", label: "thumbnails", language: "", src: PLAYBACK.storyboard },
      { default: true, kind: "captions", label: "English", language: "en-US", src: PLAYBACK.captions[0]?.src },
      { default: false, kind: "captions", label: "Polski", language: "pl-PL", src: PLAYBACK.captions[1]?.src },
    ])
  })

  it("turns on the captions in the page's language", () => {
    const { container } = renderPlayer("pl-PL")

    expect(container.querySelector('track[srclang="pl-PL"]')).toHaveProperty("default", true)
    expect(container.querySelector('track[srclang="en-US"]')).toHaveProperty("default", false)
  })

  it("offers the poster at two widths and fills the frame", () => {
    const { container } = renderPlayer("en-US")
    const poster = container.querySelector(`img[src="${PLAYBACK.poster}"]`)

    expect(poster).toHaveAttribute("srcset", `${PLAYBACK.posterSmall} 960w, ${PLAYBACK.poster} 1920w`)
    expect(poster).toHaveAttribute("sizes", "100vw")
    expect(poster).toHaveAttribute("alt", "")
    expect(container.firstElementChild).toHaveClass("aspect-video", "max-w-4xl")
    expect(screen.getAllByRole("button").length).toBeGreaterThan(0)
  })

  it("resumes at the saved position and reports progress and the end", () => {
    const onEnded = vi.fn<() => void>()
    const onProgress = vi.fn<(seconds: number) => void>()
    const { container } = render(
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
        <VideoPlayer onEnded={onEnded} onProgress={onProgress} playback={PLAYBACK} sizes="100vw" startAt={42.5} title="Module boundaries" />
      </IntlProvider>,
    )
    const video = container.querySelector("video")
    if (video === null) {
      throw new Error("Missing video element")
    }

    fireEvent.loadedMetadata(video)
    expect(video.currentTime).toBe(42.5)
    video.currentTime = 50
    fireEvent.timeUpdate(video)
    fireEvent.ended(video)

    expect(onProgress).toHaveBeenCalledWith(50)
    expect(onEnded).toHaveBeenCalledOnce()
  })

  it("starts from the beginning and ignores events without listeners", () => {
    const { container } = renderPlayer("en-US")
    const video = container.querySelector("video")
    if (video === null) {
      throw new Error("Missing video element")
    }

    video.currentTime = 12
    fireEvent.loadedMetadata(video)
    fireEvent.timeUpdate(video)
    fireEvent.ended(video)

    expect(video.currentTime).toBe(0)
  })
})
