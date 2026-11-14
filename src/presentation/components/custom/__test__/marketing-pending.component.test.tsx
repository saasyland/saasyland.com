import { cleanup } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import {
  HomePending,
  LegalPending,
  MarketingPending,
  NewsletterPending,
  PremiumPending,
} from "~/src/presentation/components/custom/marketing-pending"

const StubObserver = vi.fn(function stubObserver(this: Pick<IntersectionObserver, "disconnect" | "observe">) {
  this.disconnect = vi.fn<() => void>()
  this.observe = vi.fn<(element: Element) => void>()
})

const renderMarketingPending = (path: string) =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <MarketingPending />
    </IntlProvider>,
    { router: createTestRouter(path) },
  )

beforeEach(() => {
  vi.stubGlobal("IntersectionObserver", StubObserver)
  vi.stubGlobal("ResizeObserver", StubObserver)
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe("path-aware skeletons", () => {
  it("renders only the layout chrome at /newsletter, which has no page skeleton", () => {
    const { container } = renderMarketingPending("/newsletter")

    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it.each([
    ["/", HomePending],
    ["/pl-PL", HomePending],
    ["/terms", LegalPending],
    ["/de-DE/newsletter/confirm", NewsletterPending],
    ["/newsletter/unsubscribe", NewsletterPending],
    ["/premium", PremiumPending],
  ])("renders the skeleton of the page at %s", (path, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderMarketingPending(path)

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })
})
