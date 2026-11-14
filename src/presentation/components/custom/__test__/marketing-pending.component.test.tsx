import { describe, expect, it } from "vite-plus/test"

import {
  expectMarketingSkeleton,
  renderMarketingPending,
  stubMarketingObservers,
} from "~/src/presentation/components/custom/__test__/fixtures/marketing-pending"
import { HomePending } from "~/src/presentation/components/custom/core-pending"

stubMarketingObservers()

describe("path-aware skeletons", () => {
  it("renders only the layout chrome at a path without a page skeleton", () => {
    const { container } = renderMarketingPending("/unknown")

    expect(container.firstElementChild).not.toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it.each(["/", "/pl-PL"])("renders the landing page skeleton at %s", (path) => {
    expectMarketingSkeleton(path, HomePending)
  })
})
