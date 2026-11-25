import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { userOrdersQuery } from "~/src/modules/order/use-cases/get-user-orders"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { MoneyAmount } from "~/src/presentation/components/custom/admin/payments/money-amount"
import { OrderStatusBadge } from "~/src/presentation/components/custom/admin/payments/order-status-badge"

export const UserOrders = ({ userId }: { readonly userId: string }): JSX.Element => {
  const t = useTranslations()

  const { orders, revenue } = useSuspenseQuery(userOrdersQuery({ userId })).data

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("pages.admin.customers.profile.title")}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 text-sm">
        <dl className="flex items-start justify-between gap-4">
          <dt className="text-muted-foreground">{t("pages.admin.customers.profile.revenue")}</dt>
          <dd className="flex flex-col items-end font-medium text-foreground">
            {revenue.length === 0 && (
              <span className="font-normal text-muted-foreground">{t("pages.admin.customers.table.noRevenue")}</span>
            )}
            {revenue.map((money) => (
              <MoneyAmount key={money.currency} money={money} />
            ))}
          </dd>
        </dl>
        {orders.length === 0 && <p className="text-muted-foreground">{t("pages.admin.customers.profile.none")}</p>}
        {orders.length > 0 && (
          <ul className="divide-y divide-border border-t border-border">
            {orders.map((order) => (
              <li className="flex items-center justify-between gap-4 py-2.5" key={order.id}>
                <Link
                  className="flex min-w-0 flex-col rounded-sm underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  params={{ orderId: order.id }}
                  to="/admin/orders/$orderId"
                >
                  <span className="truncate font-medium text-foreground">{order.description}</span>
                  <span className="text-spec text-muted-foreground">{t("auth.dates.dateTime", { value: order.placedAt })}</span>
                </Link>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <MoneyAmount money={order.total} />
                  <OrderStatusBadge status={order.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  )
}
