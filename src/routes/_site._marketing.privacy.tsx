import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AFFILIATE_PROGRAM, AFFILIATE_TERMS } from "~/src/data/affiliates"
import { SIDEBAR_COOKIE } from "~/src/data/sidebar"

import { pageHead } from "~/src/lib/seo"

import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { LegalPending } from "~/src/presentation/components/custom/legal-pending"
import { LegalSection, LegalSections } from "~/src/presentation/components/custom/legal-sections"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const SECTIONS = ["controller", "collection", "purposes", "basis", "providers", "retention", "cookies", "rights", "changes"] as const

const PrivacyPage = (): JSX.Element => {
  const t = useTranslations("pages.legal.privacy")

  return (
    <ContentPage lead={t("description")} title={t("title")}>
      <LegalSections lastUpdated={t("lastUpdated")}>
        {SECTIONS.map((section) => (
          <LegalSection key={section} title={t(`sections.${section}.title`)}>
            {t(`sections.${section}.body`, {
              cookieDays: AFFILIATE_TERMS.COOKIE_DAYS,
              email: CONTACT_EMAIL,
              program: AFFILIATE_PROGRAM,
              sidebarDays: SIDEBAR_COOKIE.DAYS,
            })}
          </LegalSection>
        ))}
      </LegalSections>
    </ContentPage>
  )
}

const NAMESPACE = "pages.legal.privacy"

export const Route = createFileRoute("/_site/_marketing/privacy")({
  component: PrivacyPage,
  head: pageHead(ROUTES.PRIVACY),
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
