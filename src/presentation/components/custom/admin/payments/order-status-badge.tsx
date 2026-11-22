import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { OrderStatus } from "~/src/modules/order/order.constants"

import { ORDER_STATUS_BADGES } from "~/src/data/payments"

import { Badge } from "~/src/presentation/components/shadcn/badge"

export const OrderStatusBadge = ({ status }: { readonly status: OrderStatus }): JSX.Element => {
  const t = useTranslations("pages.admin.orders.status")

  return <Badge variant={ORDER_STATUS_BADGES[status]}>{t(status)}</Badge>
}
