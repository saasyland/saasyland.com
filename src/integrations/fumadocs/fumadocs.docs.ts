import { notFound } from "@tanstack/react-router"
import { createServerFn } from "@tanstack/react-start"
import { getBreadcrumbItems } from "fumadocs-core/breadcrumb"
import zod from "zod/v4"

import { source } from "~/src/integrations/fumadocs/fumadocs.source"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { localeField } from "~/src/modules/_core/utils/zod-fields"

import { buildPageHead } from "~/src/lib/seo"

import { ROUTES } from "~/src/routes"

const PARENT_BREADCRUMB_INDEX = -1

const sectionSchema = zod.string().optional()

const getDocsPage = createServerFn({ method: "GET" })
  .validator(zod.object({ locale: localeField, slugs: zod.string().array() }))
  .handler(({ data: { locale, slugs } }) => {
    const page = source.getPage(slugs, locale)
    if (!page) {
      throw notFound()
    }
    const section = getBreadcrumbItems(page.url, source.getPageTree(locale)).at(PARENT_BREADCRUMB_INDEX)?.name
    return {
      description: page.data.description ?? "",
      locale,
      path: page.path,
      pathname: page.url,
      section: sectionSchema.parse(section),
      title: page.data.title,
    }
  })

export const loadDocsPage = async (splat?: string) => {
  const [{ docsContent }, page] = await Promise.all([
    import("~/src/presentation/components/custom/docs-content"),
    getDocsPage({ data: { locale: getCurrentLocale(), slugs: splat?.split("/") ?? [] } }),
  ])
  await docsContent.preload(page.path)
  return page
}

export const docsHead = ({ loaderData }: { loaderData?: Awaited<ReturnType<typeof loadDocsPage>> | undefined }) =>
  buildPageHead({
    description: loaderData?.description,
    locale: loaderData?.locale,
    pathname: loaderData?.pathname ?? ROUTES.DOCS,
    section: loaderData?.section,
    title: loaderData?.title,
    type: "article",
  })
