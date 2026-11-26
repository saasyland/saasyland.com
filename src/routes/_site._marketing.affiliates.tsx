import type { JSX, ReactNode } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useFormatter, useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AFFILIATE_PORTAL_URL, AFFILIATE_PROGRAM, AFFILIATE_TERMS } from "~/src/data/affiliates"
import { CLI_GENERATION_VALUES } from "~/src/data/cli"

import { pageHead } from "~/src/lib/seo"

import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { LegalPending } from "~/src/presentation/components/custom/legal-pending"
import { LegalSection, LegalSections } from "~/src/presentation/components/custom/legal-sections"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const SECTIONS = ["commission", "attribution", "verification", "payouts", "refunds", "rules", "buyers", "changes", "join"] as const

const PORTAL_TAGS = {
  link: (chunks: ReactNode) => (
    <a
      className="text-foreground underline underline-offset-4 hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      href={AFFILIATE_PORTAL_URL}
    >
      {chunks}
    </a>
  ),
  portal: new URL(AFFILIATE_PORTAL_URL).host,
}

const AffiliatesPage = (): JSX.Element => {
  const t = useTranslations("pages.legal.affiliates")
  const format = useFormatter()

  const terms = {
    ...CLI_GENERATION_VALUES,
    commission: AFFILIATE_TERMS.COMMISSION_PERCENT,
    cookieDays: AFFILIATE_TERMS.COOKIE_DAYS,
    email: CONTACT_EMAIL,
    holdDays: AFFILIATE_TERMS.HOLD_DAYS,
    minimumPayout: format.number(AFFILIATE_TERMS.MINIMUM_PAYOUT, {
      currency: AFFILIATE_TERMS.PAYOUT_CURRENCY,
      maximumFractionDigits: 0,
      style: "currency",
    }),
    program: AFFILIATE_PROGRAM,
  }

  return (
    <ContentPage lead={t("description", terms)} title={t("title")}>
      <LegalSections lastUpdated={t("lastUpdated")}>
        {SECTIONS.map((section) => (
          <LegalSection key={section} title={t(`sections.${section}.title`)}>
            {t.rich(`sections.${section}.body`, { ...terms, ...PORTAL_TAGS })}
          </LegalSection>
        ))}
      </LegalSections>
    </ContentPage>
  )
}

const NAMESPACE = "pages.legal.affiliates"

export const Route = createFileRoute("/_site/_marketing/affiliates")({
  component: AffiliatesPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.AFFILIATES),
  pendingComponent: LegalPending,
  staticData: { namespaces: [NAMESPACE] },
})
