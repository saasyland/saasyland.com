import { renderToString } from "react-dom/server"

import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { ConceptLoop } from "~/src/presentation/components/custom/landing-page/components/concept-loop"

type Entry = Pick<IntersectionObserverEntry, "isIntersecting">

const observers: ((entries: Entry[]) => void)[] = []
const disconnect = vi.fn()
const observe = vi.fn()
const pause = vi.fn<() => void>()
const play = vi.fn<() => Promise<void>>()

class TestIntersectionObserver {
  constructor(callback: (entries: Entry[]) => void) {
    observers.push(callback)
  }

  observe(element: Element): void {
    observe(element)
  }

  disconnect(): void {
    disconnect()
  }
}

const intersect = (isIntersecting: boolean) => {
  act(() => {
    for (const notify of observers) {
      notify([{ isIntersecting }])
    }
  })
}

beforeEach(() => {
  observers.length = 0
  disconnect.mockReset()
  observe.mockReset()
  pause.mockReset()
  play.mockReset().mockResolvedValue(undefined)
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: false })),
  )
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play)
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause)
})

afterEach(() => {
  cleanup()
  document.body.innerHTML = ""
  for (const link of document.head.querySelectorAll('link[rel="preload"][as="image"]')) {
    link.remove()
  }
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("concept loop images", () => {
  it("server-renders one responsive preload constrained to the requested media", () => {
    document.body.innerHTML = renderToString(
      <ConceptLoop
        label="Application preview"
        name="app-tour"
        preloadMedia="(min-width: 48rem)"
        sizes="(min-width: 80rem) 1198px, 100vw"
      />,
    )
    const video = screen.getByLabelText("Application preview")
    const poster = screen.getByAltText("")
    const preloads = document.body.querySelectorAll('link[rel="preload"][as="image"]')

    expect(preloads).toHaveLength(1)
    expect(preloads[0]).toHaveAttribute("media", "(min-width: 48rem)")
    expect(preloads[0]).toHaveAttribute("fetchpriority", "high")
    expect(preloads[0]).toHaveAttribute("imagesrcset", poster.getAttribute("srcset"))
    expect(preloads[0]).toHaveAttribute("imagesizes", poster.getAttribute("sizes"))
    expect(screen.getAllByAltText("")).toHaveLength(1)
    expect(poster).toHaveAttribute("loading", "lazy")
    expect(poster).not.toHaveAttribute("fetchpriority")
    expect(poster).toHaveAttribute("width", "1600")
    expect(poster).toHaveAttribute("height", "1000")
    expect(poster).toHaveAttribute("sizes", "(min-width: 80rem) 1198px, 100vw")
    expect(poster.getAttribute("srcset")).toMatch(
      /app-tour-640\.webp 640w, .*app-tour-800\.webp 800w, .*app-tour-1280\.webp 1280w, .*app-tour\.webp 1600w/u,
    )
    expect(poster).not.toHaveClass("invisible")
    expect(video).not.toHaveAttribute("poster")
    expect(video).toHaveAttribute("preload", "none")
    expect(observe).not.toHaveBeenCalled()
  })

  it("does not server-render a preload when no media query is requested", () => {
    document.body.innerHTML = renderToString(<ConceptLoop name="merge-gate" sizes="100vw" />)

    expect(document.body.querySelector('link[rel="preload"]')).toBeNull()
    expect(screen.getAllByAltText("")).toHaveLength(1)
    expect(screen.getByAltText("")).toHaveAttribute("loading", "lazy")
    expect(screen.getByAltText("")).toHaveAttribute("sizes", "auto, 100vw")
  })

  it("uses native lazy loading and automatic layout sizes for below-fold posters", () => {
    render(<ConceptLoop label="Build preview" name="merge-gate" sizes="(min-width: 64rem) 520px, 100vw" />)
    const video = screen.getByLabelText("Build preview")
    const poster = screen.getByAltText("")

    expect(poster).toHaveAttribute("loading", "lazy")
    expect(poster).not.toHaveAttribute("fetchpriority")
    expect(poster).toHaveAttribute("sizes", "auto, (min-width: 64rem) 520px, 100vw")
    expect(poster.getAttribute("srcset")).toMatch(/merge-gate-600\.webp 600w, .*merge-gate\.webp 1200w/u)
    expect(video).not.toHaveAttribute("poster")
    expect(observe).toHaveBeenCalledExactlyOnceWith(video)
  })
})

describe("concept loop playback", () => {
  it("keeps the image visible until video playback actually starts", () => {
    render(<ConceptLoop label="Application preview" name="app-tour" sizes="100vw" />)
    const video = screen.getByLabelText("Application preview")
    const poster = screen.getByAltText("")

    fireEvent.play(video)
    expect(poster).not.toHaveClass("invisible")

    fireEvent.playing(video)
    expect(poster).toHaveClass("invisible")

    fireEvent.pause(video)
    expect(poster).toHaveClass("invisible")
  })

  it("preserves the poster for unsupported media and restores it after a playback error", () => {
    render(<ConceptLoop label="Application preview" name="app-tour" sizes="100vw" />)
    const video = screen.getByLabelText("Application preview")
    const poster = screen.getByAltText("")

    fireEvent.error(video)
    expect(poster).not.toHaveClass("invisible")

    fireEvent.playing(video)
    expect(poster).toHaveClass("invisible")
    fireEvent.error(video)
    expect(poster).not.toHaveClass("invisible")
  })

  it("plays only in view and applies the requested offset only before the first playback", () => {
    render(<ConceptLoop label="Scaffolding preview" name="scaffold-cli" offsetSeconds={4} sizes="100vw" />)
    const video = screen.getByLabelText<HTMLVideoElement>("Scaffolding preview")

    intersect(false)
    expect(pause).toHaveBeenCalledOnce()
    expect(play).not.toHaveBeenCalled()

    intersect(true)
    expect(video.currentTime).toBe(4)
    expect(play).toHaveBeenCalledOnce()

    video.currentTime = 5
    intersect(false)
    intersect(true)
    expect(video.currentTime).toBe(5)
    expect(pause).toHaveBeenCalledTimes(2)
    expect(play).toHaveBeenCalledTimes(2)
  })

  it("keeps the poster visible and never starts playback for reduced motion", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true })),
    )
    render(<ConceptLoop label="Application preview" name="app-tour" sizes="100vw" />)
    intersect(true)
    intersect(false)

    expect(play).not.toHaveBeenCalled()
    expect(pause).not.toHaveBeenCalled()
    expect(observe).not.toHaveBeenCalled()
    expect(screen.getByAltText("")).not.toHaveClass("invisible")
  })

  it("keeps the poster when the browser rejects playback", async () => {
    play.mockRejectedValue(new Error("Playback unavailable"))
    render(<ConceptLoop label="Application preview" name="app-tour" sizes="100vw" />)

    await act(async () => {
      intersect(true)
      await Promise.resolve()
    })

    expect(screen.getByAltText("")).not.toHaveClass("invisible")
  })

  it("disconnects viewport observation on unmount", () => {
    const { unmount } = render(<ConceptLoop label="Application preview" name="app-tour" sizes="100vw" />)
    unmount()

    expect(disconnect).toHaveBeenCalledOnce()
  })
})
