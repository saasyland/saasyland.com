import { type ReactElement, StrictMode } from "react"

import { act, cleanup, fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { Navigation } from "~/src/presentation/components/custom/navigation"

import navigationMessages from "~/messages/en-US/components.custom.navigation.json"

interface ResizeEntry {
  contentRect: Pick<DOMRectReadOnly, "height">
}

interface TestObserver {
  readonly callback: IntersectionObserverCallback
  readonly disconnect: ReturnType<typeof vi.fn<() => void>>
  readonly observe: ReturnType<typeof vi.fn<(element: Element) => void>>
  readonly options: IntersectionObserverInit | undefined
}

const SECTION_BAND = "-42% 0px -58% 0px"

const observers: TestObserver[] = []
const resizeCallbacks: ((entries: ResizeEntry[]) => void)[] = []
const observeSize = vi.fn<(element: Element) => void>()
const disconnectSize = vi.fn<() => void>()
const supports = vi.fn<(value: string) => boolean>()

const TestIntersectionObserver = vi.fn(function intersectionObserver(
  this: Pick<IntersectionObserver, "disconnect" | "observe">,
  callback: IntersectionObserverCallback,
  options?: IntersectionObserverInit,
) {
  const observer: TestObserver = { callback, disconnect: vi.fn<() => void>(), observe: vi.fn<(element: Element) => void>(), options }
  observers.push(observer)
  this.disconnect = observer.disconnect
  this.observe = observer.observe
})

const TestResizeObserver = vi.fn(function resizeObserver(
  this: Pick<ResizeObserver, "disconnect" | "observe">,
  callback: (entries: ResizeEntry[]) => void,
) {
  resizeCallbacks.push(callback)
  this.disconnect = disconnectSize
  this.observe = observeSize
})

const sentinelObserver = (): TestObserver => {
  const observer = observers.find(({ options }) => options?.rootMargin === undefined)
  if (!observer) {
    throw new Error("The header sentinel observer is missing")
  }
  return observer
}

const sectionObserver = (): TestObserver => {
  const observer = observers.find(({ options }) => options?.rootMargin === SECTION_BAND)
  if (!observer) {
    throw new Error("The section observer is missing")
  }
  return observer
}

const intersect = (observer: TestObserver, entries: Partial<IntersectionObserverEntry>[]) => {
  act(() => {
    observer.callback(
      entries.map((entry) => ({
        boundingClientRect: new DOMRect(),
        intersectionRatio: 1,
        intersectionRect: new DOMRect(),
        isIntersecting: true,
        rootBounds: null,
        target: document.body,
        time: 0,
        ...entry,
      })),
      new IntersectionObserver(vi.fn<IntersectionObserverCallback>()),
    )
  })
}

const resizeBody = (height?: number) => {
  act(() => {
    resizeCallbacks[0]?.(height === undefined ? [] : [{ contentRect: { height } }])
  })
}

const renderNavigation = (ui: ReactElement = <Navigation />, options: { wrapper?: typeof StrictMode } = {}) =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      {ui}
    </IntlProvider>,
    options,
  )

const mobileMenu = (): HTMLElement | null => document.querySelector<HTMLElement>("#landing-mobile-menu")

const openedMobileMenu = (): HTMLElement => {
  const menu = mobileMenu()
  if (!menu) {
    throw new Error("The mobile menu is closed")
  }
  return menu
}

const linkNamed = (name: string) => screen.getByRole("link", { name })

const progressBar = (container: HTMLElement) => container.querySelector<HTMLDivElement>(".scroll-progress")

beforeEach(() => {
  observers.length = 0
  resizeCallbacks.length = 0
  vi.clearAllMocks()
  supports.mockReturnValue(false)
  vi.stubGlobal("CSS", { supports })
  vi.stubGlobal("ResizeObserver", TestResizeObserver)
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
  vi.stubGlobal("innerHeight", 800)
  vi.stubGlobal("scrollY", 0)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("public navigation links", () => {
  it("links the logo, account, docs, blog, pricing and landing sections through the router", () => {
    renderNavigation()
    const nav = screen.getByRole("navigation", { name: navigationMessages.ariaLabel })

    expect(within(nav).getByRole("link", { name: "SaaSy Land" })).toHaveAttribute("href", "/")
    expect(within(nav).getAllByRole("link", { name: navigationMessages.signIn })[0]).toHaveAttribute("href", "/auth/sign-in")
    expect(within(nav).getByRole("link", { name: navigationMessages.getStarted })).toHaveAttribute("href", "/#pricing")
    expect(within(nav).getByRole("link", { name: navigationMessages.items.docs })).toHaveAttribute("href", "/docs")
    expect(within(nav).getByRole("link", { name: navigationMessages.items.blog })).toHaveAttribute("href", "/blog")
    expect(within(nav).getByRole("link", { name: navigationMessages.items.foundation })).toHaveAttribute("href", "/#foundation")
  })

  it("highlights the section in the reading band and keeps it until another section enters", () => {
    const { unmount } = renderNavigation(
      <>
        <section id="foundation">Foundation</section>
        <section id="pricing">Pricing</section>
        <Navigation />
      </>,
    )
    const foundation = screen.getByText("Foundation", { selector: "section" })
    const pricing = screen.getByText("Pricing", { selector: "section" })
    const observer = sectionObserver()

    expect(observer.observe).toHaveBeenCalledWith(foundation)
    expect(observer.observe).toHaveBeenCalledWith(pricing)

    intersect(observer, [{ target: foundation }])
    expect(linkNamed(navigationMessages.items.foundation)).toHaveClass("text-foreground")
    expect(linkNamed(navigationMessages.items.pricing)).toHaveClass("text-muted-foreground")

    intersect(observer, [{ isIntersecting: false, target: foundation }])
    expect(linkNamed(navigationMessages.items.foundation)).toHaveClass("text-foreground")

    intersect(observer, [{ target: pricing }])
    expect(linkNamed(navigationMessages.items.pricing)).toHaveClass("text-foreground")
    expect(linkNamed(navigationMessages.items.foundation)).toHaveClass("text-muted-foreground")

    unmount()
    expect(observer.disconnect).toHaveBeenCalledOnce()
  })
})

describe("mobile menu", () => {
  it("opens with its trigger, ignores other keys and closes on Escape or the close button", async () => {
    const user = userEvent.setup()
    renderNavigation()
    const open = () => user.click(screen.getByRole("button", { name: navigationMessages.openMenu }))

    await open()
    expect(screen.getByRole("button", { name: navigationMessages.closeMenu })).toHaveAttribute("aria-expanded", "true")
    fireEvent.keyDown(document, { key: "ArrowDown" })
    expect(mobileMenu()).toBeInTheDocument()
    await user.keyboard("{Escape}")
    expect(mobileMenu()).not.toBeInTheDocument()

    await open()
    await user.click(screen.getByRole("button", { name: navigationMessages.closeMenu }))
    expect(mobileMenu()).not.toBeInTheDocument()
  })

  it("links pages, closes after a section link and removes its Escape listener on unmount", async () => {
    const user = userEvent.setup()
    const { unmount } = renderNavigation()
    const open = () => user.click(screen.getByRole("button", { name: navigationMessages.openMenu }))

    await open()
    expect(within(openedMobileMenu()).getByRole("link", { name: navigationMessages.items.docs })).toHaveAttribute("href", "/docs")
    await user.click(within(openedMobileMenu()).getByRole("link", { name: navigationMessages.items.foundation }))
    expect(mobileMenu()).not.toBeInTheDocument()

    await open()
    const remove = vi.spyOn(document, "removeEventListener")
    unmount()
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function))
  })
})

describe("navigation scroll progress", () => {
  beforeEach(() => {
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

  it("uses the native scroll timeline without fallback observers or scroll listeners", () => {
    supports.mockReturnValue(true)
    const addListener = vi.spyOn(globalThis, "addEventListener")
    const { container, unmount } = renderNavigation()

    expect(progressBar(container)).toHaveAttribute("aria-hidden", "true")
    expect(supports).toHaveBeenCalledWith("animation-timeline: scroll(root)")
    expect(resizeCallbacks).toHaveLength(0)
    expect(observeSize).not.toHaveBeenCalled()
    expect(addListener.mock.calls.filter(([type]) => type === "scroll" || type === "resize")).toEqual([])
    expect(sentinelObserver().observe).toHaveBeenCalledExactlyOnceWith(container.firstElementChild)

    unmount()
    expect(sentinelObserver().disconnect).toHaveBeenCalledOnce()
    expect(disconnectSize).not.toHaveBeenCalled()
  })

  it.each([
    { position: "top", scrollY: 0, transform: "scaleX(0)" },
    { position: "middle", scrollY: 500, transform: "scaleX(0.5)" },
    { position: "bottom", scrollY: 1000, transform: "scaleX(1)" },
    { position: "past the bottom", scrollY: 1200, transform: "scaleX(1)" },
    { position: "above the top", scrollY: -100, transform: "scaleX(0)" },
  ])("updates the fallback at $position using cached body measurements", ({ scrollY, transform }) => {
    const { container } = renderNavigation()
    resizeBody(1800)
    vi.stubGlobal("scrollY", scrollY)
    globalThis.dispatchEvent(new Event("scroll"))

    expect(observeSize).toHaveBeenCalledExactlyOnceWith(document.body)
    expect(progressBar(container)?.style.transform).toBe(transform)
  })

  it("handles restored scroll positions, content changes and viewport resizing", () => {
    vi.stubGlobal("scrollY", 500)
    const { container } = renderNavigation()
    const progress = progressBar(container)

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

  it("removes fallback listeners and disconnects every observer on unmount", () => {
    const addListener = vi.spyOn(globalThis, "addEventListener")
    const removeListener = vi.spyOn(globalThis, "removeEventListener")
    const { container, unmount } = renderNavigation()
    const progress = progressBar(container)
    resizeBody(1800)
    const scrollListener = addListener.mock.calls.find(([type]) => type === "scroll")?.[1]
    const resizeListener = addListener.mock.calls.find(([type]) => type === "resize")?.[1]

    expect(addListener).toHaveBeenCalledWith("scroll", scrollListener, { passive: true })
    expect(addListener).toHaveBeenCalledWith("resize", resizeListener)
    unmount()
    expect(disconnectSize).toHaveBeenCalledOnce()
    expect(sentinelObserver().disconnect).toHaveBeenCalledOnce()
    expect(removeListener).toHaveBeenCalledWith("scroll", scrollListener)
    expect(removeListener).toHaveBeenCalledWith("resize", resizeListener)
    vi.stubGlobal("scrollY", 500)
    globalThis.dispatchEvent(new Event("scroll"))
    globalThis.dispatchEvent(new Event("resize"))
    expect(progress?.style.transform).toBe("scaleX(0)")
  })

  it("changes the header background from sentinel visibility and restores it at the top", () => {
    renderNavigation()
    const header = screen.getByRole("banner")
    expect(header).toHaveClass("border-transparent", "bg-transparent")

    intersect(sentinelObserver(), [{ isIntersecting: false }])
    expect(header).toHaveClass("border-border", "bg-background/72", "backdrop-blur-xl")
    expect(header).not.toHaveClass("bg-transparent")
    intersect(sentinelObserver(), [{ isIntersecting: true }])
    expect(header).toHaveClass("border-transparent", "bg-transparent")
    expect(header).not.toHaveClass("backdrop-blur-xl")
    intersect(sentinelObserver(), [])
    expect(header).toHaveClass("border-border", "bg-background/72")
  })

  it("disconnects and reattaches the sentinel safely in Strict Mode", () => {
    supports.mockReturnValue(true)
    const { unmount } = renderNavigation(<Navigation />, { wrapper: StrictMode })
    const sentinels = observers.filter(({ options }) => options?.rootMargin === undefined)
    expect(sentinels.flatMap(({ observe }) => observe.mock.calls)).toHaveLength(2)
    expect(sentinels.filter(({ disconnect }) => disconnect.mock.calls.length > 0)).toHaveLength(1)
    expect(screen.getByRole("banner")).toBeInTheDocument()
    unmount()
    expect(sentinels.every(({ disconnect }) => disconnect.mock.calls.length === 1)).toBe(true)
  })
})
