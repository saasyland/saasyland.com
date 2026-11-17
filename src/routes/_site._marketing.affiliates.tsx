import type { JSX, ReactNode } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useFormatter, useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AFFILIATE_PORTAL_URL, AFFILIATE_TERMS } from "~/src/data/affiliates"

import { pageHead } from "~/src/lib/seo"

import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { LegalPending } from "~/src/presentation/components/custom/legal-pending"

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
    commission: AFFILIATE_TERMS.COMMISSION_PERCENT,
    cookieDays: AFFILIATE_TERMS.COOKIE_DAYS,
    email: CONTACT_EMAIL,
    holdDays: AFFILIATE_TERMS.HOLD_DAYS,
    minimumPayout: format.number(AFFILIATE_TERMS.MINIMUM_PAYOUT, {
      currency: AFFILIATE_TERMS.PAYOUT_CURRENCY,
      maximumFractionDigits: 0,
      style: "currency",
    }),
  }

  return (
    <ContentPage lead={t("description", terms)} title={t("title")}>
      <p className="mt-6 font-mono text-spec text-muted-foreground">{t("lastUpdated")}</p>

      <div className="mt-12 flex max-w-3xl flex-col gap-10">
        {SECTIONS.map((section) => (
          <section className="flex flex-col gap-3" key={section}>
            <h2 className="text-xl font-medium text-foreground">{t(`sections.${section}.title`)}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {t.rich(`sections.${section}.body`, { ...terms, ...PORTAL_TAGS })}
            </p>
          </section>
        ))}
      </div>
    </ContentPage>
  )
}

const NAMESPACE = "pages.legal.affiliates"

export const Route = createFileRoute("/_site/_marketing/affiliates")({
  component: AffiliatesPage,
  head: pageHead(ROUTES.AFFILIATES),
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
