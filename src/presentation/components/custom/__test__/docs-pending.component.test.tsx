import { render } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { DocsIndexPending, DocsPagePending, DocsPending } from "~/src/presentation/components/custom/docs-pending"

const BREADCRUMB = 1

const skeletonsIn = (container: HTMLElement): number => container.querySelectorAll('[data-slot="skeleton"]').length

const layoutSkeletonAt = (path: string): HTMLElement => renderWithRouter(<DocsPending />, { router: createTestRouter(path) }).container

describe("docs page skeletons", () => {
  it("marks the article of a page as the busy region and draws its breadcrumb, which the docs home does not have", () => {
    const page = render(<DocsPagePending />).container
    const home = render(<DocsIndexPending />).container

    expect(page.querySelectorAll('main[aria-busy="true"]')).toHaveLength(1)
    expect(home.querySelectorAll('main[aria-busy="true"]')).toHaveLength(1)
    expect(skeletonsIn(page)).toBe(skeletonsIn(home) + BREADCRUMB)
  })
})

describe("docs layout skeleton", () => {
  it.each(["/docs", "/pl-PL/docs"])("draws the docs home without a breadcrumb at %s, as a single busy region", (path) => {
    const home = layoutSkeletonAt(path)

    expect(home.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
    expect(skeletonsIn(home)).toBe(skeletonsIn(layoutSkeletonAt("/docs/getting-started")) - BREADCRUMB)
  })
})
