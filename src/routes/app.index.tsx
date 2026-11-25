import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import * as zod from "zod"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { licenseSearchSchema } from "~/src/modules/license/license.zod"

import { CLI_GENERATION_VALUES } from "~/src/data/cli"

import { onlyDeclaredSearch } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { AnchorButton } from "~/src/presentation/components/shadcn/button"

import { AppOverviewPending } from "~/src/presentation/components/custom/app/auth-pending"
import { LicenseOverview, loadLicenseOverview } from "~/src/presentation/components/custom/app/license-overview"

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
      <LicenseOverview />
      <div className="grid gap-8 sm:grid-cols-2">
        <section className="flex flex-col items-start gap-3">
          <div className="space-y-1">
            <h2 className="text-sm font-semibold">{t("overview.docs.title")}</h2>
            <p className="text-sm text-muted-foreground">{t("overview.docs.description", CLI_GENERATION_VALUES)}</p>
          </div>
          <AnchorButton href={ROUTES.DOCS.CLI} size="sm" variant="outline">
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

const overviewSearchSchema = zod.object({ ...licenseSearchSchema.shape })

export const Route = createFileRoute("/app/")({
  validateSearch: overviewSearchSchema,
  component: OverviewPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      loadLicenseOverview({ locale, queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.APP.INDEX),
  pendingComponent: AppOverviewPending,
  search: { middlewares: [onlyDeclaredSearch(overviewSearchSchema)] },
  staticData: { namespaces: [NAMESPACE] },
})
