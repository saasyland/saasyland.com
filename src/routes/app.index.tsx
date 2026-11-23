import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import * as zod from "zod"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { BROWSER_AREAS } from "~/src/areas/browser"
import type * as AREAS from "~/src/areas/browser.entries"
import { CLI_GENERATION_VALUES } from "~/src/data/cli"

import { onlyDeclaredSearch } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { AnchorButton } from "~/src/presentation/components/shadcn/button"

import { AppOverviewPending } from "~/src/presentation/components/custom/app/auth-pending"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

type Intersection<Union> = (Union extends unknown ? (value: Union) => void : never) extends (value: infer All) => void ? All : never

type OverviewSearch = Intersection<
  Extract<(typeof AREAS)[keyof typeof AREAS], { readonly appOverviewSearch: zod.ZodRawShape }>["appOverviewSearch"]
>

const APP_OVERVIEW_SECTIONS = BROWSER_AREAS.flatMap(({ appOverview = [] }) => appOverview)

const SEARCH_SHAPES = BROWSER_AREAS.map(({ appOverviewSearch }) => appOverviewSearch).filter((shape) => shape !== undefined)

const readsEveryShape = (shape: zod.ZodRawShape): shape is OverviewSearch =>
  SEARCH_SHAPES.every((search) => Object.entries(search).every(([param, schema]) => shape[param] === schema))

const overviewSearch = (): OverviewSearch => {
  const shape = Object.fromEntries(SEARCH_SHAPES.flatMap((search) => Object.entries(search)))

  if (!readsEveryShape(shape)) {
    throw new Error("Two areas read the same search param on the overview.")
  }

  return shape
}

const overviewSearchSchema = zod.object(overviewSearch())

const OverviewPage = (): JSX.Element => {
  const t = useTranslations("pages.app")

  return (
    <div className="flex w-full flex-col gap-8 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("metadata.description")}</p>
      </header>
      {APP_OVERVIEW_SECTIONS.map(({ key, Section }) => (
        <Section key={key} />
      ))}
      <div className="grid gap-8 sm:grid-cols-2">
        <section className="flex flex-col items-start gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t("overview.docs.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("overview.docs.description", CLI_GENERATION_VALUES)}</p>
          </div>
          <AnchorButton href={ROUTES.DOCS_CLI} size="sm" variant="outline">
            {t("overview.docs.action")}
          </AnchorButton>
        </section>
        <section className="flex flex-col items-start gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t("overview.support.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("overview.support.description")}</p>
          </div>
          <AnchorButton href={`mailto:${CONTACT_EMAIL}`} size="sm" variant="outline">
            {t("overview.support.action")}
          </AnchorButton>
        </section>
      </div>
    </div>
  )
}

const NAMESPACE = "pages.app"

export const Route = createFileRoute("/app/")({
  validateSearch: overviewSearchSchema,
  component: OverviewPage,
  head: pageHead(ROUTES.APP),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      ...APP_OVERVIEW_SECTIONS.map(({ load }) => load({ locale, queryClient: context.queryClient })),
      ...APP_OVERVIEW_SECTIONS.map(({ Section }) => Section.preload?.()),
    ])
    return { locale, metadata }
  },
  pendingComponent: AppOverviewPending,
  search: { middlewares: [onlyDeclaredSearch(overviewSearchSchema)] },
  staticData: { namespaces: [NAMESPACE] },
})
