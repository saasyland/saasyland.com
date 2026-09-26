import type { ReactElement } from "react"

import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { AppLicensePending, AppOverviewPending, AppPending } from "~/src/presentation/components/custom/app/app-pending"

const markupOf = (ui: ReactElement) => {
  const { container, unmount } = render(ui)
  const markup = container.innerHTML
  unmount()
  return markup
}

const busyMarkup = (container: HTMLElement) => container.querySelector('[aria-busy="true"]')?.outerHTML

afterEach(cleanup)

describe("customer app skeletons", () => {
  it.each([
    ["/app", AppOverviewPending],
    ["/pl-PL/app", AppOverviewPending],
    ["/app/license", AppLicensePending],
    ["/uk-UA/app/license", AppLicensePending],
  ])("renders the skeleton of the page at %s", (path, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<AppPending />, { router: createTestRouter(path) })

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })

  it("renders only the app chrome for a path without a page skeleton", () => {
    const { container } = renderWithRouter(<AppPending />, { router: createTestRouter("/app/unknown") })

    expect(container.firstElementChild).not.toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })
})
