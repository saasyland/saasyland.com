import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { REFUND_TERMS } from "~/src/data/refunds"

import { pageHead } from "~/src/lib/seo"

import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { LegalPending } from "~/src/presentation/components/custom/legal-pending"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const SECTIONS = ["beforeUse", "afterUse", "withdrawal", "usage", "request", "processing", "chargebacks", "freeServices"] as const

const RefundsPage = (): JSX.Element => {
  const t = useTranslations("pages.legal.refunds")

  return (
    <ContentPage lead={t("description")} title={t("title")}>
      <p className="mt-6 font-mono text-spec text-muted-foreground">{t("lastUpdated")}</p>

      <div className="mt-12 flex max-w-3xl flex-col gap-10">
        {SECTIONS.map((section) => (
          <section className="flex flex-col gap-3" key={section}>
            <h2 className="text-xl font-medium text-foreground">{t(`sections.${section}.title`)}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {t(`sections.${section}.body`, { days: REFUND_TERMS.WITHDRAWAL_DAYS, email: CONTACT_EMAIL })}
            </p>
          </section>
        ))}
      </div>
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
