import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { createFileRoute } from "@tanstack/react-router"
import { ExternalLink } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getOrderQuery } from "~/src/modules/order/use-cases/get-order"

import { rethrowAsNotFound } from "~/src/lib/not-found"
import { buildPageHead } from "~/src/lib/seo"

import { AnchorButton } from "~/src/presentation/components/shadcn/button"

import { AdminPageHeader } from "~/src/presentation/components/custom/admin/admin-page-header"
import { AdminOrderPending } from "~/src/presentation/components/custom/admin/payments-pending"
import { OrderPolar } from "~/src/presentation/components/custom/admin/payments/order-polar"
import { OrderStatusBadge } from "~/src/presentation/components/custom/admin/payments/order-status-badge"
import { OrderAccount, OrderSummary } from "~/src/presentation/components/custom/admin/payments/order-summary"

import { ROUTES } from "~/src/routes"

const OrderPage = (): JSX.Element => {
  const t = useTranslations("pages.admin.orders.detail")
  const { orderId } = Route.useParams()

  const { order, polar, polarUrl } = useSuspenseQuery(getOrderQuery({ orderId })).data

  return (
    <div className="flex w-full animate-in flex-col gap-6 pb-6 duration-500 fade-in-50">
      <AdminPageHeader
        actions={
          <AnchorButton className="h-9 gap-2" href={polarUrl} rel="noreferrer" size="sm" target="_blank" variant="outline">
            <ExternalLink aria-hidden className="size-4" />
            {t("openInPolar")}
          </AnchorButton>
        }
        back={{ label: t("back"), to: ROUTES.ADMIN_ORDERS }}
        title={order.description}
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-spec break-all text-muted-foreground">{order.id}</span>
          <OrderStatusBadge status={order.status} />
        </div>
      </AdminPageHeader>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <div className="flex min-w-0 flex-col gap-6">
          <OrderSummary order={order} />
          <OrderAccount order={order} />
        </div>
        <OrderPolar polar={polar} />
      </div>
    </div>
  )
}

const NAMESPACES = ["pages.admin.orders", "countries"] as const

export const Route = createFileRoute("/admin/orders/$orderId")({
  component: OrderPage,
  head: ({ loaderData }: { loaderData?: { locale: SupportedLocale; pathname: string; title: string } | undefined }) =>
    buildPageHead({ locale: loaderData?.locale, pathname: loaderData?.pathname ?? ROUTES.ADMIN_ORDERS, title: loaderData?.title }),
  loader: async ({ context, params }) => {
    const locale = getCurrentLocale()
    const [{ order }] = await Promise.all([
      context.queryClient.query(getOrderQuery({ orderId: params.orderId })).catch(rethrowAsNotFound),
      preloadNamespaces({ locale, namespaces: NAMESPACES, queryClient: context.queryClient }),
    ])
    return { locale, pathname: `${ROUTES.ADMIN_ORDERS}/${order.id}`, title: order.description }
  },
  pendingComponent: AdminOrderPending,
  staticData: { namespaces: NAMESPACES },
})
