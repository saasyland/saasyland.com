import { describe, expect, it } from "vite-plus/test"

import {
  expectMarketingSkeleton,
  renderMarketingPending,
  stubMarketingObservers,
} from "~/src/presentation/components/custom/__test__/fixtures/marketing-pending"
import { NewsletterPending } from "~/src/presentation/components/custom/newsletter-pending"

import { ROUTES } from "~/src/routes"

stubMarketingObservers()

describe("newsletter skeletons", () => {
  it("renders only the layout chrome at /newsletter, which has no page skeleton", () => {
    const { container } = renderMarketingPending(ROUTES.NEWSLETTER)

    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it.each([`/de-DE${ROUTES.NEWSLETTER_CONFIRM}`, ROUTES.NEWSLETTER_UNSUBSCRIBE])("renders the newsletter skeleton at %s", (path) => {
    expectMarketingSkeleton(path, NewsletterPending)
  })
})
