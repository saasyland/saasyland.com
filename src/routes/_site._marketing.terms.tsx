import type { JSX, ReactNode } from "react"

import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { REFUND_TERMS } from "~/src/data/refunds"

import { pageHead } from "~/src/lib/seo"

import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { LegalPending } from "~/src/presentation/components/custom/legal-pending"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const SECTIONS = ["operator", "accounts", "purchases", "payments", "licence", "conduct", "refunds", "responsibility", "law"] as const

const SECTION_TAGS = {
  days: REFUND_TERMS.WITHDRAWAL_DAYS,
  email: CONTACT_EMAIL,
  withdrawal: (chunks: ReactNode) => (
    <Link
      className="text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      to={ROUTES.WITHDRAWAL}
    >
      {chunks}
    </Link>
  ),
}

const TermsPage = (): JSX.Element => {
  const t = useTranslations("pages.legal.terms")

  return (
    <ContentPage lead={t("description")} title={t("title")}>
      <p className="mt-6 font-mono text-spec text-muted-foreground">{t("lastUpdated")}</p>

      <div className="mt-12 flex max-w-3xl flex-col gap-10">
        {SECTIONS.map((section) => (
          <section className="flex flex-col gap-3" key={section}>
            <h2 className="text-xl font-medium text-foreground">{t(`sections.${section}.title`)}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">
              {t.rich(`sections.${section}.body`, SECTION_TAGS)}
            </p>
          </section>
        ))}
      </div>
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
