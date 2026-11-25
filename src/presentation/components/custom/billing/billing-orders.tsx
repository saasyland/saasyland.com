import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "use-intl/react"

import { type OrderStatus, REVENUE_ORDER_STATUSES } from "~/src/modules/order/order.constants"
import { currentOrdersQuery } from "~/src/modules/order/use-cases/get-current-orders"

import { ORDER_STATUS_BADGES } from "~/src/data/billing"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { InvoiceButton } from "~/src/presentation/components/custom/billing/invoice-button"
import { MoneyAmount } from "~/src/presentation/components/custom/billing/money-amount"

const INVOICED_STATUSES: ReadonlySet<OrderStatus> = new Set(REVENUE_ORDER_STATUSES)

export const BillingOrders = (): JSX.Element => {
  const t = useTranslations("pages.billing.orders")
  const format = useFormatter()

  const { orders } = useSuspenseQuery(currentOrdersQuery).data

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {orders.length === 0 && <p className="text-sm text-muted-foreground">{t("none")}</p>}
        <ul className="flex flex-col divide-y divide-border empty:hidden">
          {orders.map((order) => (
            <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3 first:pt-0 last:pb-0" key={order.id}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium wrap-anywhere text-foreground">{order.description}</span>
                <span className="text-spec text-muted-foreground">{format.dateTime(order.placedAt, "date")}</span>
                {order.invoiceNumber !== null && (
                  <span className="font-mono text-spec break-all text-muted-foreground">{order.invoiceNumber}</span>
                )}
              </span>
              <span className="flex items-center gap-4">
                <span className="flex flex-col items-end gap-1 text-sm font-medium text-foreground">
                  <MoneyAmount money={order.total} />
                  {order.refunded.amount > 0 && (
                    <span className="text-spec font-normal text-muted-foreground">
                      {t("refunded", {
                        amount: format.number(order.refunded.amount, { currency: order.refunded.currency, style: "currency" }),
                      })}
                    </span>
                  )}
                  <Badge variant={ORDER_STATUS_BADGES[order.status]}>{t(`status.${order.status}`)}</Badge>
                </span>
                {INVOICED_STATUSES.has(order.status) && <InvoiceButton order={order} />}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
