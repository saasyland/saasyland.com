import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { PremiumPending } from "~/src/presentation/components/custom/marketing-pending"

import { ROUTES } from "~/src/routes"

const PremiumPage = (): JSX.Element => {
  const t = useTranslations("pages.premium")

  return <div>{t("metadata.title")}</div>
}

const NAMESPACE = "pages.premium"

export const Route = createFileRoute("/_landing/premium")({
  component: PremiumPage,
  head: pageHead(ROUTES.PREMIUM),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: PremiumPending,
  staticData: { namespaces: [NAMESPACE] },
})
