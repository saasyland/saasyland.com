import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { LegalPending } from "~/src/presentation/components/custom/marketing-pending"

import { ROUTES } from "~/src/routes"

const SECTIONS = ["operator", "accounts", "purchases", "payments", "licence", "conduct", "refunds", "responsibility", "law"] as const

const TermsPage = (): JSX.Element => {
  const t = useTranslations("pages.legal.terms")

  return (
    <div className="container mx-auto max-w-3xl px-6 py-16 md:py-24">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{t("lastUpdated")}</p>
        <h1 className="text-3xl font-medium tracking-tight text-foreground md:text-4xl" data-testid="legal-document-title">
          {t("title")}
        </h1>
        <p className="text-base leading-relaxed text-muted-foreground">{t("description")}</p>
      </div>

      <div className="mt-12 flex flex-col gap-10">
        {SECTIONS.map((section) => (
          <section className="flex flex-col gap-3" key={section}>
            <h2 className="text-xl font-medium text-foreground">{t(`sections.${section}.title`)}</h2>
            <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground">{t(`sections.${section}.body`)}</p>
          </section>
        ))}
      </div>
    </div>
  )
}

const NAMESPACE = "pages.legal.terms"

export const Route = createFileRoute("/_landing/terms")({
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
