import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { POLAR_READ } from "~/src/modules/order/order.constants"
import type { Order } from "~/src/modules/order/order.types"

import { ORDER_POLAR_AMOUNTS, ORDER_POLAR_DETAILS } from "~/src/data/payments"

import { AnchorButton } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { OrderStatusBadge } from "~/src/presentation/components/custom/admin/payments/order-status-badge"
import { MoneyAmount } from "~/src/presentation/components/custom/billing/money-amount"

type PolarDetail = (typeof ORDER_POLAR_DETAILS)[number]

const PolarUnavailable = (): JSX.Element => {
  const t = useTranslations("pages.admin.orders.detail.polar.unavailable")

  return (
    <div className="rounded-lg border border-amber-500/25 bg-amber-500/10 p-3 text-sm" role="status">
      <p className="font-medium text-foreground">{t("title")}</p>
      <p className="mt-1 text-muted-foreground">{t("description")}</p>
    </div>
  )
}

const PolarFigures = ({ live }: { readonly live: Order["polarOrder"] }): JSX.Element => {
  const t = useTranslations()

  const given = (value: string | null | undefined): string => {
    if (value === null || value === undefined || value.length === 0) {
      return t("pages.admin.orders.detail.none")
    }

    return value
  }

  const country = (code: Order["polarOrder"]["billingCountry"]): string => {
    if (code === undefined) {
      return t("pages.admin.orders.detail.none")
    }

    return t(`countries.${code}`)
  }

  const discount = (): string => {
    if (live.discountName === undefined) {
      return t("pages.admin.orders.detail.none")
    }

    if (live.discountCode === undefined || live.discountCode === null) {
      return live.discountName
    }

    return t("pages.admin.orders.discount.withCode", { code: live.discountCode, name: live.discountName })
  }

  const values: Record<PolarDetail, JSX.Element | string> = {
    billingCountry: country(live.billingCountry),
    billingName: given(live.billingName),
    customerEmail: given(live.customerEmail),
    customerName: given(live.customerName),
    discountName: discount(),
    status: <OrderStatusBadge status={live.orderStatus} />,
  }

  return (
    <div className="flex flex-col gap-4">
      <dl className="divide-y divide-border text-sm">
        {ORDER_POLAR_AMOUNTS.map((amount) => (
          <div className="flex items-center justify-between gap-4 py-2.5" key={amount}>
            <dt className="text-muted-foreground">{t(`pages.admin.orders.detail.polar.amounts.${amount}`)}</dt>
            <dd className="text-right font-medium text-foreground">
              <MoneyAmount money={live.amounts[amount]} />
            </dd>
          </div>
        ))}
      </dl>
      <dl className="divide-y divide-border border-t border-border text-sm">
        {ORDER_POLAR_DETAILS.map((detail) => (
          <div className="flex items-center justify-between gap-4 py-2.5" key={detail}>
            <dt className="text-muted-foreground">{t(`pages.admin.orders.detail.polar.fields.${detail}`)}</dt>
            <dd className="min-w-0 text-right wrap-anywhere text-foreground">{values[detail]}</dd>
          </div>
        ))}
      </dl>
      {live.invoiceUrl !== undefined && (
        <AnchorButton className="w-fit" href={live.invoiceUrl} rel="noreferrer" size="sm" target="_blank" variant="outline">
          {t("pages.admin.orders.detail.polar.invoice")}
        </AnchorButton>
      )}
      {live.invoiceUrl === undefined && <p className="text-sm text-muted-foreground">{t("pages.admin.orders.detail.polar.noInvoice")}</p>}
    </div>
  )
}

export const OrderPolar = ({ polar }: { readonly polar: Order["detail"]["polar"] }): JSX.Element => {
  const t = useTranslations("pages.admin.orders.detail.polar")

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        {polar.read === POLAR_READ.UNAVAILABLE && <PolarUnavailable />}
        {polar.read === POLAR_READ.AVAILABLE && <PolarFigures live={polar} />}
      </CardContent>
    </Card>
  )
}
