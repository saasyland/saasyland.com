import type { JSX, ReactNode } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { REFUND_TERMS } from "~/src/data/refunds"

import { pageHead } from "~/src/lib/seo"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { LegalLink } from "~/src/presentation/components/custom/legal-sections"
import { WithdrawalForm } from "~/src/presentation/components/custom/withdrawal-form"
import { WithdrawalPending } from "~/src/presentation/components/custom/withdrawal-pending"

import * as ROUTES from "~/src/routes"

const RIGHTS_TAGS = {
  days: REFUND_TERMS.WITHDRAWAL_DAYS,
  refunds: (chunks: ReactNode) => <LegalLink to={ROUTES.REFUNDS}>{chunks}</LegalLink>,
}

const ACCOUNT_TAGS = {
  license: (chunks: ReactNode) => <LegalLink to={ROUTES.APP_LICENSE}>{chunks}</LegalLink>,
}

const WithdrawalPage = (): JSX.Element => {
  const t = useTranslations("pages.withdrawal")

  return (
    <ContentPage lead={t("description")} title={t("title")}>
      <div className="mt-12 flex max-w-3xl flex-col gap-8">
        <p className="text-sm leading-relaxed text-pretty text-muted-foreground">{t.rich("rights", RIGHTS_TAGS)}</p>
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("form.title")}</h2>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <WithdrawalForm />
          </CardContent>
        </Card>
        <p className="text-sm text-muted-foreground">{t.rich("account", ACCOUNT_TAGS)}</p>
      </div>
    </ContentPage>
  )
}

const NAMESPACE = "pages.withdrawal"

export const Route = createFileRoute("/_site/_marketing/withdrawal")({
  component: WithdrawalPage,
  head: pageHead(ROUTES.WITHDRAWAL),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: WithdrawalPending,
  staticData: { namespaces: [NAMESPACE] },
})
