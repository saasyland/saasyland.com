import germanLanding from "../../messages/de-DE/pages.landing.json" with { type: "json" }
import englishLanding from "../../messages/en-US/pages.landing.json" with { type: "json" }
import polishLanding from "../../messages/pl-PL/pages.landing.json" with { type: "json" }
import { MARKETING_SECTION_IDS } from "../../src/data/navigation.constants"
import { APP_NAME } from "../../src/presentation/branding"
import { ROUTES } from "../../src/routes"
import { COPY_MATRIX, type VisualLocale, visualName } from "../data/visual"
import { test } from "../fixtures/test"
import { expectRegion, openForScreenshots, sectionWith } from "../fixtures/visual"

const LANDING = { "de-DE": germanLanding, "en-US": englishLanding, "pl-PL": polishLanding } as const satisfies Record<
  VisualLocale,
  typeof englishLanding
>

for (const target of COPY_MATRIX) {
  const { locale, viewport } = target

  test(`the landing page, its header and its footer in ${locale} at ${String(viewport.width)}px match their approved screenshots`, async ({
    page,
  }) => {
    await openForScreenshots(page, { locale, path: ROUTES.HOME, viewport })
    const copy = LANDING[locale]
    const footer = page.getByRole("contentinfo")

    await expectRegion(page, page.getByRole("banner"), visualName("header", target))
    await expectRegion(page, page.locator("#floor"), visualName("hero", target))
    await expectRegion(page, page.locator(`#${MARKETING_SECTION_IDS.PRICING}`), visualName("pricing", target))
    await expectRegion(page, sectionWith(page, page.getByRole("heading", { level: 2, name: copy.cases.title })), visualName("cases", target))
    await expectRegion(page, page.locator("#manifesto"), visualName("manifesto", target))
    await expectRegion(page, page.locator("#gate"), visualName("closing", target))
    await expectRegion(page, footer, visualName("footer", target), [footer.locator("p").filter({ has: page.getByText(APP_NAME, { exact: true }) })])
  })
}
