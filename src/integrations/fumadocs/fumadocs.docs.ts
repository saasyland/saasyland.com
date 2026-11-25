import { isNotFound, notFound } from "@tanstack/react-router"
import { loadDocsIndex } from "virtual:content-indexes"

import type { DocsPage } from "~/src/integrations/fumadocs/fumadocs.indexes"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { notFoundHead } from "~/src/lib/not-found"
import { buildPageHead } from "~/src/lib/seo"

import { ROUTES } from "~/src/routes"

export const loadDocsPage = async (splat = ""): Promise<DocsPage> => {
  const [{ docsContent }, { pages }] = await Promise.all([
    import("~/src/presentation/components/custom/docs-content"),
    loadDocsIndex(getCurrentLocale()),
  ])
  const page = new Map(Object.entries(pages)).get(splat)

  if (page === undefined) {
    throw notFound()
  }

  await docsContent.preload(page.path)

  return page
}

export const docsHead = ({ loaderData, match }: { loaderData?: DocsPage | undefined; match: { error: unknown } }) => {
  if (isNotFound(match.error)) {
    return notFoundHead(getCurrentLocale())
  }

  return buildPageHead({
    description: loaderData?.description,
    locale: loaderData?.locale,
    pathname: loaderData?.pathname ?? ROUTES.DOCS.INDEX,
    section: loaderData?.section,
    title: loaderData?.title,
    type: "article",
  })
}
