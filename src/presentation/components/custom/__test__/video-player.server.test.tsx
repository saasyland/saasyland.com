import { renderToString } from "react-dom/server"

import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import type { Video } from "~/src/modules/video/video.types"

import { VideoPlayer } from "~/src/presentation/components/custom/video-player"

const BASE = "/media/abc.0123/0195a2b4-6c8d-7e9f-8a0b-1c2d3e4f5a6b"

const PLAYBACK: Video["playback"] = {
  captions: [],
  poster: `${BASE}/poster.webp`,
  posterSmall: `${BASE}/poster-960.webp`,
  src: `${BASE}/master.m3u8`,
  storyboard: `${BASE}/storyboard.vtt`,
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("VideoPlayer on the server", () => {
  it("renders the poster without starting the stream", () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch")

    const html = renderToString(
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
        <VideoPlayer playback={PLAYBACK} sizes="100vw" title="Module boundaries" />
      </IntlProvider>,
    )

    expect(html).toContain(`src="${PLAYBACK.poster}"`)
    expect(html).not.toContain(PLAYBACK.storyboard)
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
