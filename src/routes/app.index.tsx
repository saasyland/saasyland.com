import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { APP_OVERVIEW_SECTIONS, appOverviewSearchSchema } from "~/src/data/app-overview"

import { pageHead } from "~/src/lib/seo"

import { LinkButton } from "~/src/presentation/components/shadcn/button"

import { AppOverviewPending } from "~/src/presentation/components/custom/app/auth-pending"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

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
            <p className="text-sm text-muted-foreground">{t("overview.docs.description")}</p>
          </div>
          <LinkButton href={ROUTES.DOCS} size="sm" variant="outline">
            {t("overview.docs.action")}
          </LinkButton>
        </section>
        <section className="flex flex-col items-start gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t("overview.support.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("overview.support.description")}</p>
          </div>
          <LinkButton href={`mailto:${CONTACT_EMAIL}`} size="sm" variant="outline">
            {t("overview.support.action")}
          </LinkButton>
        </section>
      </div>
    </div>
  )
}

const NAMESPACE = "pages.app"

export const Route = createFileRoute("/app/")({
  validateSearch: appOverviewSearchSchema,
  component: OverviewPage,
  head: pageHead(ROUTES.APP),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      ...APP_OVERVIEW_SECTIONS.map(({ load }) => load({ locale, queryClient: context.queryClient })),
    ])
    return { locale, metadata }
  },
  pendingComponent: AppOverviewPending,
  staticData: { namespaces: [NAMESPACE] },
})
