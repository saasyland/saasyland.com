import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { Download, Filter, Settings } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { ADMIN_PAYMENTS_TABS, ADMIN_PAYMENT_ROWS } from "~/src/data/admin"

import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card } from "~/src/presentation/components/shadcn/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { AdminPaymentsPending } from "~/src/presentation/components/custom/admin/administration-pending"
import { refundColumns } from "~/src/presentation/components/custom/admin/payments/refund-columns"
import { RefundStats } from "~/src/presentation/components/custom/admin/payments/refund-stats"
import { DataTable } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

const PaymentsPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.payments")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div>
        <h1 className="text-statement font-semibold text-foreground">{t("title")}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t("description")}</p>
      </div>

      <Tabs defaultSelectedKey="refunds" className="w-full">
        <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line" className="no-scrollbar flex-1 justify-start gap-6 overflow-x-auto">
            {ADMIN_PAYMENTS_TABS.map((tab) => (
              <TabsTrigger className="flex-none px-0 text-sm" id={tab} key={tab}>
                {t(`tabs.${tab}`)}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className="flex flex-wrap items-center gap-3 pb-3 sm:pb-0">
            <Button variant="outline" size="sm" className="h-9 gap-2">
              <Download className="size-4" />
              {t("actions.export")}
            </Button>
            <Button size="sm" className="h-9 gap-2">
              <Settings className="size-4" />
              {t("actions.settings")}
            </Button>
          </div>
        </div>

        <TabsContent id="refunds" className="mt-6 space-y-6">
          <RefundStats />

          <Card className="flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-medium text-foreground">{t("table.title")}</h2>
              <Button aria-label={t("table.filter")} className="size-8 text-muted-foreground" size="icon" variant="ghost">
                <Filter className="size-4" />
              </Button>
            </div>
            <DataTable columns={refundColumns} data={ADMIN_PAYMENT_ROWS} />
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

const NAMESPACE = "pages.admin.payments"

export const Route = createFileRoute("/admin/payments")({
  component: PaymentsPage,
  head: pageHead(ROUTES.ADMIN_PAYMENTS),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminPaymentsPending,
  staticData: { namespaces: [NAMESPACE] },
})
