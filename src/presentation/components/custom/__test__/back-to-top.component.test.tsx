import type { ReactNode } from "react"

import { act, cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { BackToTop } from "~/src/presentation/components/custom/back-to-top"

import backToTopMessages from "~/messages/en-US/components.custom.back-to-top.json"

interface TestObserver {
  readonly callback: IntersectionObserverCallback
  readonly disconnect: ReturnType<typeof vi.fn<() => void>>
  readonly observe: ReturnType<typeof vi.fn<(element: Element) => void>>
  readonly options: IntersectionObserverInit | undefined
}

const FIRST_SCREEN = "100% 0px 0px 0px"
const REDUCED_MOTION_SCROLL = /@media \(prefers-reduced-motion: reduce\) \{\s*html \{\s*scroll-behavior: auto;/u
const HIDDEN_CLASSES = ["invisible", "translate-y-2", "opacity-0"]

const observers: TestObserver[] = []
const scrollTo = vi.fn<(options: ScrollToOptions) => void>()

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

const sentinelObserver = (): TestObserver => {
  const [observer] = observers
  if (!observer) {
    throw new Error("The back-to-top sentinel observer is missing")
  }
  return observer
}

const scrollPastFirstScreen = (isPast: boolean) => {
  act(() => {
    sentinelObserver().callback(
      [
        {
          boundingClientRect: new DOMRect(),
          intersectionRatio: Number(!isPast),
          intersectionRect: new DOMRect(),
          isIntersecting: !isPast,
          rootBounds: null,
          target: document.body,
          time: 0,
        },
      ],
      new IntersectionObserver(vi.fn<IntersectionObserverCallback>()),
    )
  })
}

const renderBackToTop = ({ children, locale = "en-US" }: { children?: ReactNode; locale?: SupportedLocale } = {}) =>
  render(
    <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
      {children}
      <BackToTop />
    </IntlProvider>,
  )

const backToTop = () => screen.getByRole("button", { name: backToTopMessages.label })

beforeEach(() => {
  observers.length = 0
  vi.stubGlobal("IntersectionObserver", TestIntersectionObserver)
  vi.stubGlobal("scrollTo", scrollTo)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("back to top visibility", () => {
  it("stays hidden near the top and watches a sentinel one screen deep instead of scroll events", () => {
    const addListener = vi.spyOn(globalThis, "addEventListener")
    const { container } = renderBackToTop()

    expect(backToTop()).toHaveClass(...HIDDEN_CLASSES)
    expect(sentinelObserver().options).toEqual({ rootMargin: FIRST_SCREEN })
    expect(sentinelObserver().observe).toHaveBeenCalledExactlyOnceWith(container.firstElementChild)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(addListener.mock.calls.filter(([type]) => type === "scroll")).toEqual([])
  })

  it("appears once the first screen has scrolled away and hides again near the top", () => {
    renderBackToTop()

    scrollPastFirstScreen(true)
    expect(backToTop()).not.toHaveClass(...HIDDEN_CLASSES)

    scrollPastFirstScreen(false)
    expect(backToTop()).toHaveClass(...HIDDEN_CLASSES)
  })

  it("disconnects its observer when the layout unmounts", () => {
    const { unmount } = renderBackToTop()

    unmount()
    expect(sentinelObserver().disconnect).toHaveBeenCalledOnce()
  })
})

describe("back to top label", () => {
  it.each(I18N.SUPPORTED_LOCALES)("names the button from the %s messages", (locale) => {
    renderBackToTop({ locale })

    const label = screen.getByRole("button").getAttribute("aria-label")
    expect(getTestMessages(locale)).toHaveProperty(["components", "custom", "back-to-top", "label"], label)
  })

  it("is translated in every locale", () => {
    const labels = I18N.SUPPORTED_LOCALES.map((locale) => {
      renderBackToTop({ locale })
      const label = screen.getByRole("button").getAttribute("aria-label")
      cleanup()
      return label
    })

    expect(new Set(labels).size).toBe(I18N.SUPPORTED_LOCALES.length)
  })
})

describe("back to top press", () => {
  it("scrolls to the top and moves focus to the page heading", async () => {
    const user = userEvent.setup({ delay: null })
    renderBackToTop({ children: <h1>Ship it</h1> })
    scrollPastFirstScreen(true)

    await user.click(backToTop())

    const heading = screen.getByRole("heading", { level: 1, name: "Ship it" })
    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0 })
    expect(heading).toHaveFocus()
    expect(heading).toHaveAttribute("tabindex", "-1")
  })

  it("leaves the scroll behaviour to the stylesheet, which is instant under reduced motion", async () => {
    const user = userEvent.setup({ delay: null })
    renderBackToTop()
    scrollPastFirstScreen(true)

    backToTop().focus()
    await user.keyboard("{Enter}")

    expect(scrollTo).toHaveBeenCalledExactlyOnceWith({ top: 0 })
    expect(readFileSync(resolve("src/presentation/styles/globals.css"), "utf8")).toMatch(REDUCED_MOTION_SCROLL)
  })

  it("keeps focus on the button when the page has no heading", async () => {
    const user = userEvent.setup({ delay: null })
    renderBackToTop()
    scrollPastFirstScreen(true)

    await user.click(backToTop())

    expect(scrollTo).toHaveBeenCalledOnce()
    expect(backToTop()).toHaveFocus()
  })
})
