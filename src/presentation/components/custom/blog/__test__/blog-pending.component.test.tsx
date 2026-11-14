import { cleanup } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { BlogIndexPending, BlogPending, BlogPostPending } from "~/src/presentation/components/custom/blog/blog-pending"

afterEach(cleanup)

describe("path-aware skeletons", () => {
  it.each([
    ["/blog", BlogIndexPending],
    ["/ja-JP/blog", BlogIndexPending],
    ["/blog/saasy-land-release", BlogPostPending],
  ])("renders the skeleton of the page at %s", (path, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
        <BlogPending />
      </IntlProvider>,
      { router: createTestRouter(path) },
    )

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(busyMarkup(container)).toBe(page)
  })
})
