import { type JSX, Suspense } from "react"

import { noop } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { checkoutSearchSchema } from "~/src/modules/order/order.zod"
import { currentOrdersQuery } from "~/src/modules/order/use-cases/get-current-orders"
import { currentSubscriptionsQuery } from "~/src/modules/subscription/use-cases/get-current-subscriptions"

import { onlyDeclaredSearch } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { BillingOrders } from "~/src/presentation/components/custom/billing/billing-orders"
import { AppBillingPending, BillingHistoryPending, ConfirmationPending } from "~/src/presentation/components/custom/billing/billing-pending"
import { BillingSubscriptions } from "~/src/presentation/components/custom/billing/billing-subscriptions"
import { CheckoutConfirmation } from "~/src/presentation/components/custom/billing/checkout-confirmation"
import { ManageBillingButton } from "~/src/presentation/components/custom/billing/manage-billing-button"

import { ROUTES } from "~/src/routes"

const BillingPage = (): JSX.Element => {
  const t = useTranslations("pages.billing")

  const { checkoutId } = Route.useSearch()

  return (
    <div className="flex w-full flex-col gap-8 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("metadata.description")}</p>
        </div>
        <Suspense>
          <ManageBillingButton />
        </Suspense>
      </header>
      {checkoutId !== undefined && (
        <Suspense fallback={<ConfirmationPending />}>
          <CheckoutConfirmation checkoutId={checkoutId} />
        </Suspense>
      )}
      <Suspense fallback={<BillingHistoryPending />}>
        <BillingSubscriptions />
        <BillingOrders />
      </Suspense>
    </div>
  )
}

const NAMESPACE = "pages.billing"

export const Route = createFileRoute("/app/billing")({
  validateSearch: checkoutSearchSchema,
  component: BillingPage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    void context.queryClient.query({ ...currentOrdersQuery, staleTime: "static" }).catch(noop)
    void context.queryClient.query({ ...currentSubscriptionsQuery, staleTime: "static" }).catch(noop)
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.APP.BILLING),
  pendingComponent: AppBillingPending,
  search: { middlewares: [onlyDeclaredSearch(checkoutSearchSchema)] },
  staticData: { namespaces: [NAMESPACE] },
})
