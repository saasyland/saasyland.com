import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { ChevronDown, Filter, PlusCircle } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AdminPricingModelsPending } from "~/src/presentation/components/custom/admin/offerings-pending"
import { PricingModelsGrid } from "~/src/presentation/components/custom/admin/pricing-models/models-grid"
import { PricingModelStats } from "~/src/presentation/components/custom/admin/pricing-models/stats"

import { ROUTES } from "~/src/routes"

const PricingModelsPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.pricing-models")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 pb-8 duration-500 fade-in-50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("metadata.description")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="lg" className="hidden items-center gap-2 sm:flex">
            <Filter className="size-4" />
            {t("actions.allTypes")}
            <ChevronDown className="ml-1 size-3" />
          </Button>
          <Button size="lg" className="flex items-center gap-2 shadow-sm">
            <PlusCircle className="size-4" />
            {t("actions.createModel")}
          </Button>
        </div>
      </div>

      <PricingModelStats />

      <PricingModelsGrid />
    </div>
  )
}

const NAMESPACE = "pages.admin.pricing-models"

export const Route = createFileRoute("/admin/pricing-models")({
  component: PricingModelsPage,
  head: pageHead(ROUTES.ADMIN_PRICING),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminPricingModelsPending,
  staticData: { namespaces: [NAMESPACE] },
})
