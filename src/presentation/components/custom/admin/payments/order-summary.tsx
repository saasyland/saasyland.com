import type { JSX, ReactNode } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import type { Order } from "~/src/modules/order/order.types"

import { ORDER_MIRROR_DETAILS } from "~/src/data/payments"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { MoneyAmount } from "~/src/presentation/components/custom/admin/payments/money-amount"

type MirrorDetail = (typeof ORDER_MIRROR_DETAILS)[number]

export const OrderSummary = ({ order }: { readonly order: Order["detail"]["order"] }): JSX.Element => {
  const t = useTranslations()

  const optional = (value: string | null): string => {
    if (value === null) {
      return t("pages.admin.orders.detail.none")
    }

    return value
  }

  const values: Record<MirrorDetail, ReactNode> = {
    changedAt: t("common.dateTime", { value: order.changedAt }),
    customerId: <span className="font-mono text-spec">{order.customerId}</span>,
    invoiceNumber: optional(order.invoiceNumber),
    placedAt: t("common.dateTime", { value: order.placedAt }),
    product: order.description,
    refunded: <MoneyAmount money={order.refunded} />,
    subscription: optional(order.subscriptionId),
    total: <MoneyAmount money={order.total} />,
  }

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("pages.admin.orders.detail.mirror.title")}</h2>
        </CardTitle>
        <CardDescription>{t("pages.admin.orders.detail.mirror.description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <dl className="divide-y divide-border text-sm">
          {ORDER_MIRROR_DETAILS.map((detail) => (
            <div className="flex items-center justify-between gap-4 py-2.5" key={detail}>
              <dt className="text-muted-foreground">{t(`pages.admin.orders.detail.mirror.fields.${detail}`)}</dt>
              <dd className="min-w-0 text-right wrap-anywhere text-foreground">{values[detail]}</dd>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  )
}

export const OrderAccount = ({ order }: { readonly order: Order["detail"]["order"] }): JSX.Element => {
  const t = useTranslations("pages.admin.orders.detail.account")

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {order.user === null && <p className="text-muted-foreground">{t("none")}</p>}
        {order.user !== null && (
          <div className="flex flex-col gap-1">
            <Link
              className="w-fit rounded-sm font-medium text-foreground underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              params={{ userId: order.user.id }}
              to="/admin/users/$userId"
            >
              {order.user.name}
            </Link>
            <span className="text-muted-foreground">{order.user.email}</span>
            <p className="mt-2 text-muted-foreground">{t("profile")}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
