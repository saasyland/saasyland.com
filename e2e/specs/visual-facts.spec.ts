import type { Locator } from "@playwright/test"

import germanProof from "../../messages/de-DE/pages.landing.proof.json" with { type: "json" }
import englishProof from "../../messages/en-US/pages.landing.proof.json" with { type: "json" }
import polishProof from "../../messages/pl-PL/pages.landing.proof.json" with { type: "json" }
import { ROUTES } from "../../src/routes"
import { COPY_MATRIX, type VisualLocale, visualName } from "../data/visual"
import { test } from "../fixtures/test"
import { expectRegion, openForScreenshots, sectionWith } from "../fixtures/visual"

const PROOF = { "de-DE": germanProof, "en-US": englishProof, "pl-PL": polishProof } as const satisfies Record<VisualLocale, typeof englishProof>

const COUNTED_FACTS = ["admin", "components", "stars", "tests"] as const

const COUNTED_NOTES = ["tests"] as const

const countedFacts = (facts: Locator, locale: VisualLocale): Locator[] => {
  const labels = PROOF[locale].facts
  const factOf = (key: keyof typeof labels): Locator => facts.locator("dl > div").filter({ has: facts.page().getByText(labels[key].label, { exact: true }) })

  return [
    ...COUNTED_FACTS.map((key) => factOf(key).getByRole("definition").first()),
    ...COUNTED_NOTES.map((key) => factOf(key).getByRole("definition").last()),
  ]
}

for (const target of COPY_MATRIX) {
  const { locale, viewport } = target

  test(`the landing page's facts grid in ${locale} at ${String(viewport.width)}px matches its approved screenshot`, async ({ page }) => {
    await openForScreenshots(page, { locale, path: ROUTES.HOME, viewport })
    const facts = sectionWith(page, page.getByText(PROOF[locale].facts.stars.label, { exact: true }))

    await expectRegion(page, facts, visualName("facts", target), countedFacts(facts, locale))
  })
}
