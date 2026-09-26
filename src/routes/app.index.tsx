import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { pageHead } from "~/src/lib/seo"

import { LinkButton } from "~/src/presentation/components/shadcn/button"

import { AppOverviewPending } from "~/src/presentation/components/custom/app/app-pending"
import { CheckoutOptions } from "~/src/presentation/components/custom/app/checkout-options"
import { LicenseStatusCard } from "~/src/presentation/components/custom/app/license-status-card"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const OverviewPage = (): JSX.Element => {
  const t = useTranslations("pages.app")
  const { license } = useSuspenseQuery(currentLicenseQuery).data

  return (
    <div className="flex w-full flex-col gap-8 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("metadata.description")}</p>
      </header>
      {license === undefined && <CheckoutOptions />}
      {license !== undefined && <LicenseStatusCard />}
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
  component: OverviewPage,
  head: pageHead(ROUTES.APP),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...currentLicenseQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AppOverviewPending,
  staticData: { namespaces: [NAMESPACE] },
})
