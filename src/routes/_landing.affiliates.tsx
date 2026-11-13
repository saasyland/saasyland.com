import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useFormatter, useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { AFFILIATE_TERMS } from "~/src/data/affiliates"

import { pageHead } from "~/src/lib/seo"

import { LegalPending } from "~/src/presentation/components/custom/marketing-pending"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const SECTIONS = ["commission", "attribution", "verification", "payouts", "refunds", "rules", "buyers", "changes", "join"] as const

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
    <div className="container mx-auto max-w-3xl px-6 py-16 md:py-24">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>
        <h1 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl" data-testid="legal-document-title">
          {t("title")}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">{t("description", terms)}</p>
      </div>

      <div className="mt-12 flex flex-col gap-10">
        {SECTIONS.map((section) => (
          <section className="flex flex-col gap-3" key={section}>
            <h2 className="text-xl font-medium text-foreground">{t(`sections.${section}.title`)}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{t(`sections.${section}.body`, terms)}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

const NAMESPACE = "pages.legal.affiliates"

export const Route = createFileRoute("/_landing/affiliates")({
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
