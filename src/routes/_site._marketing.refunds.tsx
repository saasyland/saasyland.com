import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { LegalPending } from "~/src/presentation/components/custom/legal-pending"
import { LegalSection, LegalSections, WITHDRAWAL_TAGS } from "~/src/presentation/components/custom/legal-sections"

import { ROUTES } from "~/src/routes"

const SECTIONS = [
  "beforeUse",
  "afterUse",
  "withdrawal",
  "withdrawalFunction",
  "usage",
  "request",
  "processing",
  "chargebacks",
  "freeServices",
] as const

const RefundsPage = (): JSX.Element => {
  const t = useTranslations("pages.legal.refunds")

  return (
    <ContentPage lead={t("description")} title={t("title")}>
      <LegalSections lastUpdated={t("lastUpdated")}>
        {SECTIONS.map((section) => (
          <LegalSection key={section} title={t(`sections.${section}.title`)}>
            {t.rich(`sections.${section}.body`, WITHDRAWAL_TAGS)}
          </LegalSection>
        ))}
      </LegalSections>
    </ContentPage>
  )
}

const NAMESPACE = "pages.legal.refunds"

export const Route = createFileRoute("/_site/_marketing/refunds")({
  component: RefundsPage,
  head: pageHead(ROUTES.REFUNDS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: LegalPending,
  staticData: { namespaces: [NAMESPACE] },
})
