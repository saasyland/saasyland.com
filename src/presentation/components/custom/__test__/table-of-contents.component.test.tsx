import { act, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { TableOfContents } from "~/src/presentation/components/custom/table-of-contents"

const ITEMS = [
  { depth: 2, title: "Start", url: "#start" },
  { depth: 3, title: "Detail", url: "#detail" },
  { depth: 2, title: "Collapsed", url: "#collapsed" },
  { depth: 2, title: "Elsewhere", url: "#elsewhere" },
  { depth: 2, title: "Wrap up", url: "#wrap-up" },
] as const

const HEADINGS = [
  { height: 30, id: "start", top: 1000 },
  { height: 30, id: "detail", top: 2500 },
  { height: 0, id: "collapsed", top: 0 },
  { height: 30, id: "wrap-up", top: 4000 },
] as const

const ENTRY_HEIGHTS = [20, 40, 20, 20, 20] as const
const VIEWPORT_HEIGHT = 800
const LIST_HEIGHT = 40

const frames = new Map<number, FrameRequestCallback>()
const resizeCallbacks: ResizeObserverCallback[] = []
const disconnect = vi.fn<() => void>()
const scrollList = vi.fn<(options?: ScrollToOptions) => void>()
const motionListeners: (() => void)[] = []
const motion = { matches: false }
let nextFrame = 0

const requestFrame = vi.fn((callback: FrameRequestCallback) => {
  nextFrame += 1
  frames.set(nextFrame, callback)
  return nextFrame
})

const cancelFrame = vi.fn((id: number) => {
  frames.delete(id)
})

class TestResizeObserver {
  readonly disconnect = disconnect
  readonly observe = vi.fn<(element: Element) => void>()
  readonly unobserve = vi.fn<(element: Element) => void>()

  constructor(callback: ResizeObserverCallback) {
    resizeCallbacks.push(callback)
  }
}

const OBSERVER: ResizeObserver = {
  disconnect: vi.fn<() => void>(),
  observe: vi.fn<(target: Element) => void>(),
  unobserve: vi.fn<(target: Element) => void>(),
}

const flushFrames = (): void => {
  act(() => {
    for (const [id, callback] of frames) {
      frames.delete(id)
      callback(0)
    }
  })
}

const resize = (): void => {
  for (const callback of resizeCallbacks) {
    callback([], OBSERVER)
  }
  flushFrames()
}

const scrollPage = (top: number): void => {
  vi.stubGlobal("scrollY", top)
  fireEvent.scroll(globalThis.window)
  flushFrames()
}

interface PlacedHeading {
  readonly height: number
  readonly id: string
  readonly top: number
}

const placeHeading = ({ height, id, top }: PlacedHeading): void => {
  const heading = document.querySelector(`#${id}`)
  if (heading !== null) {
    vi.spyOn(heading, "getBoundingClientRect").mockImplementation(() => new DOMRect(0, top - globalThis.scrollY, 600, height))
  }
}

const list = (): HTMLElement => {
  const scroller = screen.getByRole("list").parentElement
  if (scroller === null) {
    throw new Error("The table of contents has no scroll area")
  }
  return scroller
}

const renderContents = () => {
  const view = render(
    <>
      {HEADINGS.map(({ id }) => (
        <h2 id={id} key={id}>
          {id}
        </h2>
      ))}
      <TableOfContents className="max-h-40" items={ITEMS} />
    </>,
  )
  let top = 0
  for (const [index, link] of screen.getAllByRole("link").entries()) {
    const height = ENTRY_HEIGHTS[index] ?? 0
    Object.defineProperties(link, { offsetHeight: { value: height }, offsetTop: { value: top } })
    top += height
  }
  Object.defineProperty(list(), "clientHeight", { configurable: true, value: LIST_HEIGHT })
  Object.defineProperty(list(), "scrollTo", { configurable: true, value: scrollList })
  for (const heading of HEADINGS) {
    placeHeading(heading)
  }
  return view
}

const thumb = (): { readonly height: string; readonly top: string } => ({
  height: list().style.getPropertyValue("--thumb-height"),
  top: list().style.getPropertyValue("--thumb-top"),
})

const current = (): string | null => screen.queryByRole("link", { current: "location" })?.textContent ?? null

beforeEach(() => {
  frames.clear()
  resizeCallbacks.length = 0
  motionListeners.length = 0
  motion.matches = false
  nextFrame = 0
  vi.stubGlobal("scrollY", 0)
  vi.stubGlobal("requestAnimationFrame", requestFrame)
  vi.stubGlobal("cancelAnimationFrame", cancelFrame)
  vi.stubGlobal("ResizeObserver", TestResizeObserver)
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      addEventListener: (_type: string, listener: () => void) => {
        motionListeners.push(listener)
      },
      get matches() {
        return motion.matches
      },
    })),
  )
  Object.defineProperty(document.documentElement, "clientHeight", { configurable: true, value: VIEWPORT_HEIGHT })
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.clearAllMocks()
  Reflect.deleteProperty(document.documentElement, "clientHeight")
})

describe("TableOfContents", () => {
  it("links every heading, indents nested ones and marks none current before the page is measured", () => {
    renderContents()

    expect(screen.getByRole("link", { name: "Start" })).toHaveAttribute("href", "#start")
    expect(screen.getByRole("link", { name: "Start" })).toHaveClass("pl-4")
    expect(screen.getByRole("link", { name: "Detail" })).toHaveClass("pl-7")
    expect(current()).toBeNull()
    expect(thumb()).toStrictEqual({ height: "", top: "" })
  })

  it("draws no thumb and marks no section at the top of the page", () => {
    renderContents()
    resize()

    expect(current()).toBeNull()
    expect(thumb()).toStrictEqual({ height: "0", top: "0px" })
  })

  it("rests the thumb on the section the reader is in and marks its entry as the current location", () => {
    renderContents()
    resize()
    scrollPage(1200)

    expect(current()).toBe("Start")
    expect(thumb()).toStrictEqual({ height: "20", top: "0px" })
  })

  it("glides the thumb toward the next entry as the next heading rises to the reading line", () => {
    renderContents()
    resize()
    scrollPage(2000)

    expect(current()).toBe("Start")
    expect(thumb()).toStrictEqual({ height: "30", top: "10px" })

    scrollPage(2400)

    expect(current()).toBe("Detail")
    expect(thumb()).toStrictEqual({ height: "40", top: "20px" })
  })

  it("skips headings that are missing from the page or take no space", () => {
    renderContents()
    resize()
    scrollPage(3900)

    expect(current()).toBe("Wrap up")
    expect(thumb()).toStrictEqual({ height: "20", top: "100px" })
  })

  it("draws one frame for the scroll events that arrive before it", () => {
    renderContents()
    resize()
    requestFrame.mockClear()
    vi.stubGlobal("scrollY", 1200)
    fireEvent.scroll(globalThis.window)
    fireEvent.scroll(globalThis.window)

    expect(requestFrame).toHaveBeenCalledOnce()
  })

  it("scrolls its own list, never the page, to keep the current entry in view", () => {
    renderContents()
    resize()
    scrollPage(1200)

    expect(scrollList).not.toHaveBeenCalled()

    scrollPage(3900)

    expect(scrollList).toHaveBeenCalledWith({ behavior: "smooth", top: 90 })

    list().scrollTop = 90
    scrollPage(1200)

    expect(scrollList).toHaveBeenLastCalledWith({ behavior: "smooth", top: -10 })
  })

  it("keeps the thumb on the current entry and jumps the list when the reader prefers reduced motion", () => {
    renderContents()
    resize()
    scrollPage(2000)
    motion.matches = true
    for (const listener of motionListeners) {
      listener()
    }
    flushFrames()

    expect(current()).toBe("Start")
    expect(thumb()).toStrictEqual({ height: "20", top: "0px" })

    scrollPage(3900)

    expect(scrollList).toHaveBeenCalledWith({ behavior: "instant", top: 90 })
  })

  it("measures the headings again when the window resizes", () => {
    renderContents()
    resize()
    scrollPage(1200)
    placeHeading({ height: 30, id: "detail", top: 1300 })
    fireEvent(globalThis.window, new Event("resize"))
    flushFrames()

    expect(current()).toBe("Detail")
  })

  it("stops following the page once it unmounts", () => {
    const { unmount } = renderContents()
    resize()
    vi.stubGlobal("scrollY", 1200)
    fireEvent.scroll(globalThis.window)
    const [pending] = frames.keys()
    unmount()
    requestFrame.mockClear()
    fireEvent.scroll(globalThis.window)

    expect(cancelFrame).toHaveBeenCalledWith(pending)
    expect(disconnect).toHaveBeenCalledOnce()
    expect(requestFrame).not.toHaveBeenCalled()
  })
})
