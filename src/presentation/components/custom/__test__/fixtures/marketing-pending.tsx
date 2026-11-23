import type { JSX } from "react"

import { cleanup } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, expect, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { MarketingPending } from "~/src/presentation/components/custom/marketing-pending"

import { routeTree } from "~/src/routeTree.gen"

const StubObserver = vi.fn(function stubObserver(this: Pick<IntersectionObserver, "disconnect" | "observe">) {
  this.disconnect = vi.fn<() => void>()
  this.observe = vi.fn<(element: Element) => void>()
})

export const stubMarketingObservers = (): void => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", StubObserver)
    vi.stubGlobal("ResizeObserver", StubObserver)
  })

  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
  })
}

export const renderMarketingPending = (path: string) =>
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
      <MarketingPending />
    </IntlProvider>,
    { router: createTestRouter(path, routeTree) },
  )

export const expectMarketingSkeleton = (path: string, Page: () => JSX.Element): void => {
  const page = markupOf(<Page />)
  const { container } = renderMarketingPending(path)

  expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
  expect(busyMarkup(container)).toBe(page)
}
