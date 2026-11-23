import { it } from "vite-plus/test"

import { expectMarketingSkeleton, stubMarketingObservers } from "~/src/presentation/components/custom/__test__/fixtures/marketing-pending"
import { LegalPending } from "~/src/presentation/components/custom/legal-pending"

import * as ROUTES from "~/src/routes"

stubMarketingObservers()

it.each([ROUTES.AFFILIATES, ROUTES.LICENCE, ROUTES.PRIVACY, ROUTES.REFUNDS, ROUTES.TERMS, `/de-DE${ROUTES.TERMS}`])(
  "renders the legal page skeleton at %s",
  (path) => {
    expectMarketingSkeleton(path, LegalPending)
  },
)
