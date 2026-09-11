import type { ReactElement } from "react"

import { act, cleanup, fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { Footer } from "~/src/presentation/components/custom/footer/footer"
import { FooterCopyright } from "~/src/presentation/components/custom/footer/footer-copyright"
import { MobileMenu } from "~/src/presentation/components/custom/navigation/mobile-menu"
import { Navigation } from "~/src/presentation/components/custom/navigation/navigation"

import { APP_FOUNDED_YEAR, APP_GITHUB_URL } from "~/src/presentation/branding"

const messages = getTestMessages("en-US")
const callbacks: { callback: IntersectionObserverCallback; options?: IntersectionObserverInit }[] = []
const observe = vi.fn()
const disconnect = vi.fn()

const renderMarketing = (ui: ReactElement) =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={messages} timeZone="UTC">
      {ui}
    </IntlProvider>,
  )

beforeEach(() => {
  callbacks.length = 0
  observe.mockClear()
  disconnect.mockClear()
  vi.stubGlobal("CSS", { supports: () => true })
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        callbacks.push({ callback, ...(options && { options }) })
      }
      observe = observe
      disconnect = disconnect
    },
  )
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("public navigation", () => {
  it("links the logo, account, docs, blog and pricing and tracks visible sections", () => {
    const { unmount } = renderMarketing(
      <>
        <section id="foundation">Foundation</section>
        <Navigation />
      </>,
    )
    const nav = screen.getByRole("navigation", { name: messages.components.navigation.ariaLabel })
    expect(within(nav).getByRole("link", { name: messages.components.navigation.signIn })).toHaveAttribute("href", "/auth/sign-in")
    expect(within(nav).getByRole("link", { name: messages.components.navigation.getStarted })).toHaveAttribute("href", "#pricing")
    expect(within(nav).getByRole("link", { name: messages.components.navigation.items.docs })).toHaveAttribute("href", "/docs")
    expect(within(nav).getByRole("link", { name: messages.components.navigation.items.blog })).toHaveAttribute("href", "/blog")
    const section = screen.getByText("Foundation", { selector: "section" })
    expect(observe).toHaveBeenCalledWith(section)
    const activeObserver = callbacks.find(({ options }) => options?.rootMargin === "-42% 0px -58% 0px")
    if (!activeObserver) {
      throw new Error("Section observer is missing")
    }
    const observer = new IntersectionObserver(vi.fn<IntersectionObserverCallback>())
    const entry = {
      boundingClientRect: new DOMRect(),
      intersectionRatio: 1,
      intersectionRect: new DOMRect(),
      isIntersecting: true,
      rootBounds: null,
      target: section,
      time: 0,
    }
    act(() => {
      activeObserver.callback([entry], observer)
    })
    expect(screen.getByRole("link", { name: messages.components.navigation.items.foundation })).toHaveClass("text-foreground")
    act(() => {
      activeObserver.callback([{ ...entry, isIntersecting: false }], observer)
    })
    expect(screen.getByRole("link", { name: messages.components.navigation.items.foundation })).toHaveClass("text-foreground")
    unmount()
    expect(disconnect).toHaveBeenCalledTimes(2)
  })

  it("opens and closes the mobile menu with its trigger, Escape, and a section link", async () => {
    const user = userEvent.setup()
    const { unmount } = renderMarketing(<MobileMenu />)
    const open = () => user.click(screen.getByRole("button", { name: messages.components.navigation.openMenu }))
    await open()
    expect(screen.getByRole("button", { name: messages.components.navigation.closeMenu })).toHaveAttribute("aria-expanded", "true")
    fireEvent.keyDown(document, { key: "ArrowDown" })
    expect(screen.getByRole("link", { name: messages.components.navigation.items.docs })).toHaveAttribute("href", "/docs")
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    await open()
    await user.click(screen.getByRole("link", { name: messages.components.navigation.items.foundation }))
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    await open()
    await user.click(screen.getByRole("button", { name: messages.components.navigation.closeMenu }))
    expect(screen.queryByRole("link")).not.toBeInTheDocument()
    await open()
    const remove = vi.spyOn(document, "removeEventListener")
    unmount()
    expect(remove).toHaveBeenCalledWith("keydown", expect.any(Function))
  })
})

describe("marketing footer", () => {
  it("includes product anchors, every legal document, newsletter signup, and language selection", () => {
    renderMarketing(<Footer />)
    const footer = screen.getByRole("contentinfo")
    for (const href of ["/#foundation", "/#pricing", "/#faq", "/blog", "/docs", "/privacy", "/terms", "/refunds", "/licence"]) {
      expect(
        within(footer)
          .getAllByRole("link")
          .some((link) => link.getAttribute("href") === href),
      ).toBe(true)
    }
    expect(within(footer).getByRole("link", { name: "GitHub" })).toHaveAttribute("href", APP_GITHUB_URL)
    expect(within(footer).getByRole("link", { name: "hello@saasyland.com" })).toHaveAttribute("href", "mailto:hello@saasyland.com")
    expect(within(footer).getByRole("textbox")).toHaveAttribute("type", "email")
    expect(within(footer).getByRole("button", { name: /English/u })).toBeVisible()
  })

  it.each([
    { expected: String(APP_FOUNDED_YEAR), year: APP_FOUNDED_YEAR },
    { expected: `${APP_FOUNDED_YEAR}–2030`, year: 2030 },
  ])("formats the copyright for $year", ({ year, expected }) => {
    vi.spyOn(Date.prototype, "getFullYear").mockReturnValue(year)
    const { container } = renderMarketing(<FooterCopyright />)
    expect(container).toHaveTextContent(expected)
  })
})
