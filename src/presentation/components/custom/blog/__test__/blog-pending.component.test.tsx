import { cleanup, render } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { AUTHOR_PROFILE } from "~/src/data/blog"

import {
  AuthorPending,
  BlogArchivePending,
  BlogIndexPending,
  BlogPending,
  BlogPostPending,
} from "~/src/presentation/components/custom/blog/blog-pending"

afterEach(cleanup)

describe("path-aware skeletons", () => {
  it.each([
    ["/blog", BlogIndexPending],
    ["/ja-JP/blog", BlogIndexPending],
    ["/blog/page/2", BlogArchivePending],
    ["/pl-PL/blog/page/3", BlogArchivePending],
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

describe("the author page skeleton", () => {
  it("mirrors the author's introduction and the list of posts", () => {
    const { container } = render(<AuthorPending />)

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(container.querySelectorAll(".rounded-full")).toHaveLength(1)
    expect(container.querySelectorAll(".size-4")).toHaveLength(Object.values(AUTHOR_PROFILE).length)
  })
})
