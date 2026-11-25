import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { LegalPending } from "~/src/presentation/components/custom/legal-pending"
import { LegalSection, LegalSections } from "~/src/presentation/components/custom/legal-sections"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import * as ROUTES from "~/src/routes"

const SECTIONS = [
  "publicCode",
  "paidMaterial",
  "keys",
  "packages",
  "output",
  "restrictions",
  "dependencies",
  "termination",
  "warranty",
  "questions",
] as const

const LicencePage = (): JSX.Element => {
  const t = useTranslations("pages.legal.licence")

  return (
    <ContentPage lead={t("description")} title={t("title")}>
      <LegalSections lastUpdated={t("lastUpdated")}>
        {SECTIONS.map((section) => (
          <LegalSection key={section} title={t(`sections.${section}.title`)}>
            {t(`sections.${section}.body`, { email: CONTACT_EMAIL })}
          </LegalSection>
        ))}
      </LegalSections>
    </ContentPage>
  )
}

const NAMESPACE = "pages.legal.licence"

export const Route = createFileRoute("/_site/_marketing/licence")({
  component: LicencePage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.LICENCE),
  pendingComponent: LegalPending,
  staticData: { namespaces: [NAMESPACE] },
})
