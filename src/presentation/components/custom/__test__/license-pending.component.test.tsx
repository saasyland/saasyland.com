import { it } from "vite-plus/test"

import { expectMarketingSkeleton, stubMarketingObservers } from "~/src/presentation/components/custom/__test__/fixtures/marketing-pending"
import { PremiumPending } from "~/src/presentation/components/custom/license-pending"

import { ROUTES } from "~/src/routes"

stubMarketingObservers()

it("renders the premium page skeleton at /premium", () => {
  expectMarketingSkeleton(ROUTES.PREMIUM, PremiumPending)
})
