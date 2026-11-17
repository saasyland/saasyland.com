import { type ReactElement, StrictMode } from "react"

import { act, cleanup, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getHeaderHref } from "~/src/platform/testing/lib/navigation"
import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { getNavigationLabel, getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { HEADER_NAVIGATION } from "~/src/data/navigation"
import { MARKETING_SECTION_IDS, SITE_CONTENT_ID } from "~/src/data/navigation.constants"

import { Navigation } from "~/src/presentation/components/custom/navigation"

import navigationMessages from "~/messages/en-US/components.custom.navigation.json"
import { APP_NAME } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

interface ResizeEntry {
  contentRect: Pick<DOMRectReadOnly, "height">
}

const pageLabel = getNavigationLabel("en-US")

const browserWindow: Window = globalThis.window
const resizeCallbacks: ((entries: ResizeEntry[]) => void)[] = []
const observeSize = vi.fn<(element: Element) => void>()
const disconnectSize = vi.fn<() => void>()
const supports = vi.fn<(value: string) => boolean>()

const TestResizeObserver = vi.fn(function resizeObserver(
  this: Pick<ResizeObserver, "disconnect" | "observe">,
  callback: (entries: ResizeEntry[]) => void,
) {
  resizeCallbacks.push(callback)
  this.disconnect = disconnectSize
  this.observe = observeSize
})

const resizeBody = (height?: number) => {
  act(() => {
    resizeCallbacks[0]?.(height === undefined ? [] : [{ contentRect: { height } }])
  })
}

const renderNavigation = (
  ui: ReactElement = <Navigation />,
  options: { router?: ReturnType<typeof createTestRouter>; wrapper?: typeof StrictMode } = {},
) =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      {ui}
    </IntlProvider>,
    options,
  )

const hrefOf = getHeaderHref("en-US")

const entryLinks = (container: HTMLElement): string[][] =>
  HEADER_NAVIGATION.map((entry) => {
    const link = within(container).getByRole("link", { name: pageLabel(entry) })
    return [pageLabel(entry), link.getAttribute("href") ?? ""]
  })

const currentLinks = (): string[] =>
  within(screen.getByRole("navigation", { name: navigationMessages.ariaLabel }))
    .queryAllByRole("link", { current: "page" })
    .map((link) => link.textContent)

const menuButton = (): HTMLElement => screen.getByRole("button", { hidden: true, name: navigationMessages.openMenu })

const menu = (): HTMLElement => screen.getByRole("dialog", { name: navigationMessages.menu })

const queryMenu = (): HTMLElement | null => screen.queryByRole("dialog", { name: navigationMessages.menu })

const callToAction = (scope: HTMLElement): HTMLElement => within(scope).getByRole("link", { name: navigationMessages.getStarted })

const PRICING_PATH = `${ROUTES.HOME}#${MARKETING_SECTION_IDS.PRICING}`

const PRICING_LABELS = HEADER_NAVIGATION.filter(({ hash }) => hash === MARKETING_SECTION_IDS.PRICING).map((entry) => pageLabel(entry))

const MENU_LINKS = [APP_NAME, ...HEADER_NAVIGATION.map((entry) => pageLabel(entry)), navigationMessages.getStarted]

type User = ReturnType<typeof userEvent.setup>

const progressBar = (container: HTMLElement) => container.querySelector<HTMLDivElement>(".scroll-progress")

beforeEach(() => {
  resizeCallbacks.length = 0
  vi.clearAllMocks()
  supports.mockReturnValue(false)
  vi.spyOn(CSS, "supports").mockImplementation(supports)
  vi.stubGlobal("ResizeObserver", TestResizeObserver)
  vi.stubGlobal("innerHeight", 800)
  vi.stubGlobal("scrollY", 0)
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("public navigation links", () => {
  it("links the logo, every header entry in its order and the call to action through the router", () => {
    renderNavigation()
    const nav = screen.getByRole("navigation", { name: navigationMessages.ariaLabel })

    expect(within(nav).getByRole("link", { name: APP_NAME })).toHaveAttribute("href", "/")
    expect(within(nav).getByRole("link", { name: navigationMessages.getStarted })).toHaveAttribute("href", "/#pricing")
    expect(entryLinks(nav)).toStrictEqual(HEADER_NAVIGATION.map((entry) => [pageLabel(entry), hrefOf(entry)]))
  })

  it("opens with a link that skips the header to the page content", () => {
    const { container } = renderNavigation()

    expect(container.firstElementChild).toBe(screen.getByRole("link", { name: navigationMessages.skipToContent }))
    expect(container.firstElementChild).toHaveAttribute("href", `#${SITE_CONTENT_ID}`)
  })

  it.each(HEADER_NAVIGATION)("marks $key as the current page with a dot only where the visitor is", (entry) => {
    const { container } = renderNavigation(<Navigation />, { router: createTestRouter(hrefOf(entry)) })
    const current = within(screen.getByRole("navigation", { name: navigationMessages.ariaLabel })).getByRole("link", {
      current: "page",
      name: pageLabel(entry),
    })

    expect(current).toHaveClass("data-[status=active]:text-foreground")
    expect(current).toHaveAttribute("data-status", "active")
    expect(current.querySelector('span[aria-hidden="true"]')).toBeInTheDocument()
    expect(container.querySelectorAll('nav a > span[aria-hidden="true"]')).toHaveLength(1)
  })

  it("marks only the logo current on the rest of the home page, and nothing on a page the header does not list", () => {
    renderNavigation(<Navigation />, { router: createTestRouter(ROUTES.HOME) })
    expect(currentLinks()).toStrictEqual([APP_NAME])
    cleanup()

    renderNavigation(<Navigation />, { router: createTestRouter(ROUTES.LICENCE) })
    expect(currentLinks()).toStrictEqual([])
  })

  it("marks Pricing on the pricing section and never the call to action that leads there", () => {
    renderNavigation(<Navigation />, { router: createTestRouter(PRICING_PATH) })

    expect(currentLinks()).toStrictEqual([APP_NAME, ...PRICING_LABELS])
    expect(callToAction(screen.getByRole("navigation", { name: navigationMessages.ariaLabel }))).not.toHaveAttribute("aria-current")
  })
})

describe("mobile menu", () => {
  it("opens as a modal dialog with focus on its close button and hides the page behind it", async () => {
    const user = userEvent.setup({ delay: null })
    renderNavigation()

    await user.click(menuButton())

    expect(menu()).toBeVisible()
    await waitFor(() => {
      expect(within(menu()).getByRole("button", { name: navigationMessages.closeMenu })).toHaveFocus()
    })
    expect(menuButton()).toHaveAttribute("aria-expanded", "true")
    expect(screen.queryByRole("banner")).not.toBeInTheDocument()
    expect(screen.getByRole("banner", { hidden: true }).closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it.each([
    { action: "Escape", close: (user: User) => user.keyboard("{Escape}") },
    {
      action: "the close button",
      close: (user: User) => user.click(within(menu()).getByRole("button", { name: navigationMessages.closeMenu })),
    },
  ])("closes on $action and returns focus to the menu button", async ({ close }) => {
    const user = userEvent.setup({ delay: null })
    renderNavigation()

    await user.click(menuButton())
    await close(user)

    expect(queryMenu()).not.toBeInTheDocument()
    await waitFor(() => {
      expect(menuButton()).toHaveFocus()
    })
    expect(menuButton()).toHaveAttribute("aria-expanded", "false")
    expect(screen.getByRole("banner")).toBeVisible()
  })

  it("lists the logo, the header entries in their order and the call to action, and closes after any of them", async () => {
    const user = userEvent.setup({ delay: null })
    renderNavigation(<Navigation />, { router: createTestRouter(ROUTES.LICENCE) })
    const open = () => user.click(menuButton())

    await open()
    expect(entryLinks(menu())).toStrictEqual(HEADER_NAVIGATION.map((entry) => [pageLabel(entry), hrefOf(entry)]))
    expect(callToAction(menu())).toHaveAttribute("href", PRICING_PATH)
    expect(
      within(menu())
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toStrictEqual(MENU_LINKS)

    for (const name of MENU_LINKS) {
      await user.click(within(menu()).getByRole("link", { name }))
      expect(queryMenu()).not.toBeInTheDocument()
      await open()
    }
  })

  it("marks Pricing on the pricing section and never the call to action", async () => {
    const user = userEvent.setup({ delay: null })
    renderNavigation(<Navigation />, { router: createTestRouter(PRICING_PATH) })

    await user.click(menuButton())

    expect(
      within(menu())
        .getAllByRole("link", { current: "page" })
        .map((link) => link.textContent),
    ).toStrictEqual([APP_NAME, ...PRICING_LABELS])
    expect(callToAction(menu())).not.toHaveAttribute("aria-current")
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
    const addListener = vi.spyOn(browserWindow, "addEventListener")
    const { container, unmount } = renderNavigation()

    expect(progressBar(container)).toHaveAttribute("aria-hidden", "true")
    expect(supports).toHaveBeenCalledWith("animation-timeline: scroll(root)")
    expect(resizeCallbacks).toHaveLength(0)
    expect(observeSize).not.toHaveBeenCalled()
    expect(addListener.mock.calls.filter(([type]) => type === "scroll" || type === "resize")).toEqual([])

    unmount()
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
    const addListener = vi.spyOn(browserWindow, "addEventListener")
    const removeListener = vi.spyOn(browserWindow, "removeEventListener")
    const { container, unmount } = renderNavigation()
    const progress = progressBar(container)
    resizeBody(1800)
    const scrollListener = addListener.mock.calls.find(([type]) => type === "scroll")?.[1]
    const resizeListener = addListener.mock.calls.find(([type]) => type === "resize")?.[1]

    expect(addListener).toHaveBeenCalledWith("scroll", scrollListener, { passive: true })
    expect(addListener).toHaveBeenCalledWith("resize", resizeListener)
    unmount()
    expect(disconnectSize).toHaveBeenCalledOnce()
    expect(removeListener).toHaveBeenCalledWith("scroll", scrollListener)
    expect(removeListener).toHaveBeenCalledWith("resize", resizeListener)
    vi.stubGlobal("scrollY", 500)
    globalThis.dispatchEvent(new Event("scroll"))
    globalThis.dispatchEvent(new Event("resize"))
    expect(progress?.style.transform).toBe("scaleX(0)")
  })

  it("keeps the header's line and background at every scroll position, without watching the scroll for them", () => {
    supports.mockReturnValue(true)
    const addListener = vi.spyOn(browserWindow, "addEventListener")
    const { container } = renderNavigation()
    const header = screen.getByRole("banner")
    const before = header.className

    vi.stubGlobal("scrollY", 500)
    globalThis.dispatchEvent(new Event("scroll"))

    expect(header).toHaveClass("border-b", "border-border", "bg-background/72", "backdrop-blur-xl")
    expect(header.className).toBe(before)
    expect(container.querySelectorAll(':scope > [aria-hidden="true"]')).toHaveLength(0)
    expect(addListener.mock.calls.filter(([type]) => type === "scroll")).toEqual([])
  })

  it("disconnects and reattaches the progress fallback safely in Strict Mode", () => {
    const { unmount } = renderNavigation(<Navigation />, { wrapper: StrictMode })
    expect(observeSize).toHaveBeenCalledTimes(2)
    expect(disconnectSize).toHaveBeenCalledOnce()
    expect(screen.getByRole("banner")).toBeInTheDocument()
    unmount()
    expect(disconnectSize).toHaveBeenCalledTimes(2)
  })
})

const preloadedPaths = (preloadRoute: { mock: { calls: unknown[][] } }) => preloadRoute.mock.calls.map(([options]) => options)

describe("header preloading", () => {
  const idleCallbacks: IdleRequestCallback[] = []
  const cancelIdle = vi.fn<(handle: number) => void>()

  const becomeIdle = () => {
    act(() => {
      for (const callback of idleCallbacks.splice(0)) {
        callback({ didTimeout: false, timeRemaining: () => 0 })
      }
    })
  }

  beforeEach(() => {
    idleCallbacks.length = 0
    vi.stubGlobal("requestIdleCallback", (callback: IdleRequestCallback) => idleCallbacks.push(callback))
    vi.stubGlobal("cancelIdleCallback", cancelIdle)
  })

  it("loads the page of every header entry through the router once the browser is idle, and not before", () => {
    const router = createTestRouter(ROUTES.LICENCE)
    const preloadRoute = vi.spyOn(router, "preloadRoute").mockResolvedValue(undefined)
    renderNavigation(<Navigation />, { router })

    expect(preloadRoute).not.toHaveBeenCalled()
    becomeIdle()
    expect(preloadedPaths(preloadRoute)).toStrictEqual(HEADER_NAVIGATION.map(({ to }) => ({ to })))
  })

  it("loads them again once the next page is shown", async () => {
    const router = createTestRouter(ROUTES.LICENCE)
    const preloadRoute = vi.spyOn(router, "preloadRoute").mockResolvedValue(undefined)
    renderNavigation(<Navigation />, { router })
    becomeIdle()

    await act(() => router.navigate({ to: ROUTES.BLOG }))
    becomeIdle()

    expect(preloadedPaths(preloadRoute)).toStrictEqual([...HEADER_NAVIGATION, ...HEADER_NAVIGATION].map(({ to }) => ({ to })))
  })

  it("loads nothing when the header goes away before the browser is idle", () => {
    const router = createTestRouter(ROUTES.LICENCE)
    const preloadRoute = vi.spyOn(router, "preloadRoute").mockResolvedValue(undefined)
    const { unmount } = renderNavigation(<Navigation />, { router })

    unmount()

    expect(cancelIdle).toHaveBeenCalledOnce()
    expect(preloadRoute).not.toHaveBeenCalled()
  })
})
