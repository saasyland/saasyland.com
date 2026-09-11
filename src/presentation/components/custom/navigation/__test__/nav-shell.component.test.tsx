import { StrictMode } from "react"

import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { NavShell } from "~/src/presentation/components/custom/navigation/nav-shell"

interface ResizeEntry {
  contentRect: Pick<DOMRectReadOnly, "height">
}
type IntersectionEntry = Pick<IntersectionObserverEntry, "isIntersecting">

const resizeCallbacks: ((entries: ResizeEntry[]) => void)[] = []
const intersectionCallbacks: ((entries: IntersectionEntry[]) => void)[] = []
const observeSize = vi.fn<(element: Element) => void>()
const disconnectSize = vi.fn<() => void>()
const observeSentinel = vi.fn<(element: Element) => void>()
const disconnectSentinel = vi.fn<() => void>()
const supports = vi.fn<(value: string) => boolean>()

const TestResizeObserver = vi.fn(function resizeObserver(
  this: Pick<ResizeObserver, "disconnect" | "observe">,
  callback: (entries: ResizeEntry[]) => void,
) {
  resizeCallbacks.push(callback)
  this.disconnect = disconnectSize
  this.observe = observeSize
})

const TestIntersectionObserver = vi.fn(function intersectionObserver(
  this: Pick<IntersectionObserver, "disconnect" | "observe">,
  callback: (entries: IntersectionEntry[]) => void,
) {
  intersectionCallbacks.push(callback)
  this.disconnect = disconnectSentinel
  this.observe = observeSentinel
})

const resizeBody = (height?: number) => {
  act(() => {
    resizeCallbacks[0]?.(height === undefined ? [] : [{ contentRect: { height } }])
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  resizeCallbacks.length = 0
  intersectionCallbacks.length = 0
  supports.mockReturnValue(false)
  vi.stubGlobal("CSS", { supports })
  vi.stubGlobal("ResizeObserver", TestResizeObserver)
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
  vi.stubGlobal("innerHeight", 800)
  vi.stubGlobal("scrollY", 0)
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => {
    throw new Error("Navigation progress must use observer measurements instead of forcing layout")
  })
  vi.spyOn(Element.prototype, "scrollHeight", "get").mockImplementation(() => {
    throw new Error("Navigation progress must cache the observed content height")
  })
  vi.spyOn(HTMLElement.prototype, "offsetHeight", "get").mockImplementation(() => {
    throw new Error("Navigation progress must cache the observed content height")
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("navigation scroll progress", () => {
  it("uses the native scroll timeline without fallback observers or scroll listeners", () => {
    supports.mockReturnValue(true)
    const addListener = vi.spyOn(globalThis, "addEventListener")
    const { container, unmount } = render(<NavShell>Navigation</NavShell>)

    expect(screen.getByRole("banner")).toHaveTextContent("Navigation")
    expect(container.querySelector(".scroll-progress")).toHaveAttribute("aria-hidden", "true")
    expect(supports).toHaveBeenCalledWith("animation-timeline: scroll(root)")
    expect(resizeCallbacks).toHaveLength(0)
    expect(observeSize).not.toHaveBeenCalled()
    expect(addListener.mock.calls.filter(([type]) => type === "scroll" || type === "resize")).toEqual([])
    expect(observeSentinel).toHaveBeenCalledExactlyOnceWith(container.firstElementChild)

    unmount()
    expect(disconnectSentinel).toHaveBeenCalledOnce()
    expect(disconnectSize).not.toHaveBeenCalled()
  })

  it.each([
    { position: "top", scrollY: 0, transform: "scaleX(0)" },
    { position: "middle", scrollY: 500, transform: "scaleX(0.5)" },
    { position: "bottom", scrollY: 1000, transform: "scaleX(1)" },
    { position: "past the bottom", scrollY: 1200, transform: "scaleX(1)" },
    { position: "above the top", scrollY: -100, transform: "scaleX(0)" },
  ])("updates the fallback at $position using cached body measurements", ({ scrollY, transform }) => {
    const { container } = render(<NavShell>Navigation</NavShell>)
    resizeBody(1800)
    vi.stubGlobal("scrollY", scrollY)
    globalThis.dispatchEvent(new Event("scroll"))

    expect(observeSize).toHaveBeenCalledExactlyOnceWith(document.body)
    expect(container.querySelector<HTMLDivElement>(".scroll-progress")?.style.transform).toBe(transform)
  })

  it("handles restored scroll positions, content changes and viewport resizing", () => {
    vi.stubGlobal("scrollY", 500)
    const { container } = render(<NavShell>Navigation</NavShell>)
    const progress = container.querySelector<HTMLDivElement>(".scroll-progress")

    resizeBody(1800)
    expect(progress?.style.transform).toBe("scaleX(0.5)")
    resizeBody(2800)
    expect(progress?.style.transform).toBe("scaleX(0.25)")
    vi.stubGlobal("innerHeight", 1800)
    globalThis.dispatchEvent(new Event("resize"))
    expect(progress?.style.transform).toBe("scaleX(0.5)")
    resizeBody()
    expect(progress?.style.transform).toBe("scaleX(0.5)")
    resizeBody(1800)
    expect(progress?.style.transform).toBe("scaleX(0)")
    resizeBody(1000)
    expect(progress?.style.transform).toBe("scaleX(0)")
  })

  it("removes fallback listeners and disconnects both observers on unmount", () => {
    const addListener = vi.spyOn(globalThis, "addEventListener")
    const removeListener = vi.spyOn(globalThis, "removeEventListener")
    const { container, unmount } = render(<NavShell>Navigation</NavShell>)
    const progress = container.querySelector<HTMLDivElement>(".scroll-progress")
    resizeBody(1800)
    const scrollListener = addListener.mock.calls.find(([type]) => type === "scroll")?.[1]
    const resizeListener = addListener.mock.calls.find(([type]) => type === "resize")?.[1]

    expect(addListener).toHaveBeenCalledWith("scroll", scrollListener, { passive: true })
    expect(addListener).toHaveBeenCalledWith("resize", resizeListener)
    unmount()
    expect(disconnectSize).toHaveBeenCalledOnce()
    expect(disconnectSentinel).toHaveBeenCalledOnce()
    expect(removeListener).toHaveBeenCalledWith("scroll", scrollListener)
    expect(removeListener).toHaveBeenCalledWith("resize", resizeListener)
    vi.stubGlobal("scrollY", 500)
    globalThis.dispatchEvent(new Event("scroll"))
    globalThis.dispatchEvent(new Event("resize"))
    expect(progress?.style.transform).toBe("scaleX(0)")
  })

  it("changes the header background from sentinel visibility and restores it at the top", () => {
    render(<NavShell>Navigation</NavShell>)
    const header = screen.getByRole("banner")
    expect(header).toHaveClass("border-transparent", "bg-transparent")

    act(() => intersectionCallbacks[0]?.([{ isIntersecting: false }]))
    expect(header).toHaveClass("border-border", "bg-background/72", "backdrop-blur-xl")
    expect(header).not.toHaveClass("bg-transparent")
    act(() => intersectionCallbacks[0]?.([{ isIntersecting: true }]))
    expect(header).toHaveClass("border-transparent", "bg-transparent")
    expect(header).not.toHaveClass("backdrop-blur-xl")
    act(() => intersectionCallbacks[0]?.([]))
    expect(header).toHaveClass("border-border", "bg-background/72")
  })
})

it("disconnects and reattaches the sentinel safely in Strict Mode", () => {
  supports.mockReturnValue(true)
  const { unmount } = render(
    <StrictMode>
      <NavShell>Navigation</NavShell>
    </StrictMode>,
  )
  expect(observeSentinel).toHaveBeenCalledTimes(2)
  expect(disconnectSentinel).toHaveBeenCalledOnce()
  expect(screen.getByRole("banner")).toHaveTextContent("Navigation")
  unmount()
  expect(disconnectSentinel).toHaveBeenCalledTimes(2)
})
