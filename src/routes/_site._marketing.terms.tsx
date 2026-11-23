import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { LegalPending } from "~/src/presentation/components/custom/legal-pending"
import { LegalSection, LegalSections, WITHDRAWAL_TAGS } from "~/src/presentation/components/custom/legal-sections"

import * as ROUTES from "~/src/routes"

const SECTIONS = ["operator", "accounts", "purchases", "payments", "licence", "conduct", "refunds", "responsibility", "law"] as const

const TermsPage = (): JSX.Element => {
  const t = useTranslations("pages.legal.terms")

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

const NAMESPACE = "pages.legal.terms"

export const Route = createFileRoute("/_site/_marketing/terms")({
  component: TermsPage,
  head: pageHead(ROUTES.TERMS),
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
