import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { AdminLandingPagePending } from "~/src/presentation/components/custom/admin/content-pending"
import { LandingPageActions } from "~/src/presentation/components/custom/admin/landing-page/actions"
import { LandingPageCanvas } from "~/src/presentation/components/custom/admin/landing-page/canvas"
import { LandingPageProperties } from "~/src/presentation/components/custom/admin/landing-page/properties"
import { LandingPageSections } from "~/src/presentation/components/custom/admin/landing-page/sections"

import { ROUTES } from "~/src/routes"

const LandingPagePage = (): JSX.Element => {
  const t = useTranslations("pages.admin.landing-page")

  return (
    <div className="flex min-h-0 w-full flex-1 animate-in flex-col pb-4 duration-500 fade-in-50 motion-reduce:animate-none">
      <header className="mb-6 flex shrink-0 flex-col gap-4 border-b border-border pb-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-statement font-semibold text-balance text-foreground">{t("metadata.title")}</h1>
          <p className="mt-0.5 max-w-2xl text-body-sm text-pretty text-muted-foreground">{t("metadata.description")}</p>
        </div>
        <LandingPageActions />
      </header>

      <div className="flex min-h-0 flex-1 flex-col divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:flex-row lg:divide-x lg:divide-y-0">
        <LandingPageSections />
        <LandingPageCanvas />
        <LandingPageProperties />
      </div>
    </div>
  )
}

const NAMESPACE = "pages.admin.landing-page"

export const Route = createFileRoute("/admin/landing-page")({
  component: LandingPagePage,
  head: pageHead(ROUTES.ADMIN_LANDING_PAGE),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminLandingPagePending,
  staticData: { namespaces: [NAMESPACE] },
})
