import { Profiler, type ProfilerOnRenderCallback, StrictMode } from "react"
import { renderToString } from "react-dom/server"

import { act, cleanup, render, screen } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

type Entry = Pick<IntersectionObserverEntry, "boundingClientRect" | "isIntersecting" | "rootBounds" | "target">

const observe = vi.fn<(element: Element) => void>()
const unobserve = vi.fn<(element: Element) => void>()
const observers: ((entries: Entry[]) => void)[] = []

class TestIntersectionObserver {
  constructor(callback: (entries: Entry[]) => void) {
    observers.push(callback)
  }

  observe(element: Element): void {
    observe(element)
  }

  unobserve(element: Element): void {
    unobserve(element)
  }
}

const intersect = (
  target: Element,
  { top, isIntersecting, rootBounds = new DOMRect(0, 0, 1000, 800) }: { top: number; isIntersecting: boolean; rootBounds?: DOMRect | null },
) => {
  act(() => {
    for (const notify of observers) {
      notify([{ boundingClientRect: new DOMRect(0, top, 100, 100), isIntersecting, rootBounds, target }])
    }
  })
}

beforeEach(() => {
  observe.mockClear()
  unobserve.mockClear()
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
  vi.stubGlobal("innerHeight", 800)
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(() => {
    throw new Error("Reveal must use observer entries instead of forcing layout")
  })
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("reveal", () => {
  it("keeps server-rendered content visible through hydration", () => {
    const content = <Reveal>Server content</Reveal>
    document.body.innerHTML = `<div data-testid="reveal-hydration-root">${renderToString(content)}</div>`
    const container = screen.getByTestId("reveal-hydration-root")

    expect(screen.getByText("Server content")).toBeVisible()
    expect(screen.getByText("Server content")).not.toHaveAttribute("data-reveal")

    const onRecoverableError = vi.fn<(error: unknown) => void>()
    render(content, { container, hydrate: true, onRecoverableError })

    expect(screen.getByText("Server content")).toBeVisible()
    expect(screen.getByText("Server content")).not.toHaveAttribute("data-reveal")
    expect(onRecoverableError).not.toHaveBeenCalled()
    expect(observe).toHaveBeenCalledExactlyOnceWith(screen.getByText("Server content"))
  })

  it.each([
    { isIntersecting: true, position: "inside", top: 100 },
    { isIntersecting: false, position: "above", top: -200 },
  ])("never hides or animates content initially $position the viewport", ({ isIntersecting, top }) => {
    render(<Reveal>Visible content</Reveal>)
    const element = screen.getByText("Visible content")

    intersect(element, { isIntersecting, top })
    expect(element).not.toHaveAttribute("data-reveal")
    expect(unobserve).toHaveBeenCalledExactlyOnceWith(element)

    intersect(element, { isIntersecting: false, top: 1000 })
    intersect(element, { isIntersecting: true, top: 400 })
    expect(element).not.toHaveAttribute("data-reveal")
  })

  it.each([
    { distance: "0.75rem", duration: "560ms", variant: "block" },
    { distance: "1rem", duration: "700ms", variant: "heading" },
    { distance: "0rem", duration: "420ms", variant: "quiet" },
  ] as const)("reveals a below-fold $variant once with its original timing and distance", ({ distance, duration, variant }) => {
    render(
      <Reveal className="mt-14" delay={160} variant={variant}>
        Below-fold content
      </Reveal>,
    )
    const element = screen.getByText("Below-fold content")

    intersect(element, { isIntersecting: false, top: 1000 })
    expect(element).toHaveAttribute("data-reveal", "hidden")

    intersect(element, { isIntersecting: false, top: 900 })
    expect(element).toHaveAttribute("data-reveal", "hidden")
    expect(unobserve).not.toHaveBeenCalled()

    intersect(element, { isIntersecting: true, top: 600 })
    expect(element).toHaveAttribute("data-reveal", "revealed")
    expect(element).toHaveClass(
      "motion-safe:data-[reveal=hidden]:opacity-0",
      "motion-safe:data-[reveal=revealed]:animate-rise",
      `[--rise-duration:${duration}]`,
      `[--rise-distance:${distance}]`,
      "mt-14",
    )
    expect(element).toHaveStyle({ animationDelay: "160ms", animationFillMode: "backwards" })
    expect(unobserve).toHaveBeenCalledExactlyOnceWith(element)

    intersect(element, { isIntersecting: false, top: 1000 })
    expect(element).toHaveAttribute("data-reveal", "revealed")
    expect(unobserve).toHaveBeenCalledOnce()
  })

  it("uses the observer viewport and falls back to the window when root bounds are unavailable", () => {
    render(
      <>
        <Reveal>Observer viewport</Reveal>
        <Reveal>Window viewport</Reveal>
      </>,
    )
    const observerContent = screen.getByText("Observer viewport")
    const windowContent = screen.getByText("Window viewport")

    intersect(observerContent, { isIntersecting: false, rootBounds: new DOMRect(0, 0, 1000, 500), top: 600 })
    intersect(windowContent, { isIntersecting: false, rootBounds: null, top: 900 })

    expect(observerContent).toHaveAttribute("data-reveal", "hidden")
    expect(windowContent).toHaveAttribute("data-reveal", "hidden")
    expect(observers).toHaveLength(1)
    expect(observe).toHaveBeenCalledTimes(2)
  })

  it("stops observing unmounted content and ignores already queued entries", () => {
    const { unmount } = render(<Reveal>Unmounted content</Reveal>)
    const element = screen.getByText("Unmounted content")
    intersect(element, { isIntersecting: false, top: 1000 })

    unmount()
    intersect(element, { isIntersecting: true, top: 600 })

    expect(unobserve).toHaveBeenCalledExactlyOnceWith(element)
    expect(element).not.toHaveAttribute("data-reveal")
  })
})

describe("reveal lifecycle", () => {
  it("changes animation state without another React commit", () => {
    const onRender = vi.fn<ProfilerOnRenderCallback>()
    render(
      <Profiler id="reveal" onRender={onRender}>
        <Reveal>Observed content</Reveal>
      </Profiler>,
    )
    const element = screen.getByText("Observed content")

    intersect(element, { isIntersecting: false, top: 1000 })
    expect(element).toHaveAttribute("data-reveal", "hidden")

    intersect(element, { isIntersecting: true, top: 600 })
    expect(element).toHaveAttribute("data-reveal", "revealed")
    expect(onRender).toHaveBeenCalledOnce()
  })

  it("preserves observer state when the parent changes props and children", () => {
    const { rerender } = render(<Reveal>Original content</Reveal>)
    const element = screen.getByText("Original content")
    intersect(element, { isIntersecting: false, top: 1000 })

    rerender(
      <Reveal className="mt-14" delay={160} variant="heading">
        Updated content
      </Reveal>,
    )

    expect(screen.getByText("Updated content")).toBe(element)
    expect(element).toHaveAttribute("data-reveal", "hidden")
    expect(element).toHaveClass("mt-14", "[--rise-duration:700ms]")
    expect(element).toHaveStyle({ animationDelay: "160ms" })
    expect(observe).toHaveBeenCalledOnce()
    expect(unobserve).not.toHaveBeenCalled()

    intersect(element, { isIntersecting: true, top: 600 })
    rerender(<Reveal>Updated again</Reveal>)

    expect(element).toHaveAttribute("data-reveal", "revealed")
    expect(element).toHaveTextContent("Updated again")
    expect(observe).toHaveBeenCalledOnce()
    expect(unobserve).toHaveBeenCalledOnce()
  })

  it("supports Strict Mode ref cleanup and reattachment", () => {
    const { unmount } = render(
      <StrictMode>
        <Reveal>Strict content</Reveal>
      </StrictMode>,
    )
    const element = screen.getByText("Strict content")
    expect(observe).toHaveBeenCalledTimes(2)
    expect(unobserve).toHaveBeenCalledOnce()
    expect(element).not.toHaveAttribute("data-reveal")

    intersect(element, { isIntersecting: false, top: 1000 })
    expect(element).toHaveAttribute("data-reveal", "hidden")

    intersect(element, { isIntersecting: true, top: 600 })
    expect(element).toHaveAttribute("data-reveal", "revealed")

    unmount()
    intersect(element, { isIntersecting: true, top: 600 })
    expect(element).not.toHaveAttribute("data-reveal")
    expect(unobserve).toHaveBeenCalledTimes(3)
  })
})
