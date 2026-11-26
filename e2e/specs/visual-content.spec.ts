import germanBlog from "../../messages/de-DE/pages.blog.json" with { type: "json" }
import englishBlog from "../../messages/en-US/pages.blog.json" with { type: "json" }
import polishBlog from "../../messages/pl-PL/pages.blog.json" with { type: "json" }
import { ROUTES } from "../../src/routes"
import { APP_MATRIX, BLOG_CARD_MATRIX, type VisualLocale, visualName } from "../data/visual"
import { test } from "../fixtures/test"
import { expectRegion, expectScreen, openForScreenshots } from "../fixtures/visual"

const BLOG = { "de-DE": germanBlog, "en-US": englishBlog, "pl-PL": polishBlog } as const satisfies Record<VisualLocale, typeof englishBlog>

const POST = `${ROUTES.BLOG.INDEX}/ai-coding-agent-guardrails`

const DOCS_PAGE = `${ROUTES.DOCS.INDEX}/getting-started/installation`

for (const target of BLOG_CARD_MATRIX) {
  const { locale, viewport } = target

  test(`a blog post's author card and call to action in ${locale} at ${String(viewport.width)}px match their approved screenshots`, async ({
    page,
  }) => {
    await openForScreenshots(page, { locale, path: POST, viewport })
    const copy = BLOG[locale]

    await expectRegion(page, page.getByText(copy.author.writtenBy, { exact: true }).locator("xpath=../.."), visualName("blog-author", target))
    await expectRegion(
      page,
      page.getByRole("complementary").filter({ has: page.getByRole("heading", { level: 2, name: copy.post.cta.title }) }),
      visualName("blog-cta", target),
    )
  })
}

for (const target of APP_MATRIX) {
  const { locale, viewport } = target

  test(`a docs page in ${locale} at ${String(viewport.width)}px matches its approved screenshot`, async ({ page }) => {
    await openForScreenshots(page, { locale, path: DOCS_PAGE, viewport })

    await expectScreen(page, visualName("docs", target))
  })
}
