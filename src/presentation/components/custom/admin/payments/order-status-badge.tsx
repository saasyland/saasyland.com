import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { OrderStatus } from "~/src/modules/order/order.constants"

import { ADMIN_STATUS_BADGE_CLASSES } from "~/src/data/admin"
import { ORDER_STATUS_COLORS } from "~/src/data/payments"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

export const OrderStatusBadge = ({ status }: { readonly status: OrderStatus }): JSX.Element => {
  const t = useTranslations("pages.admin.orders.status")

  return (
    <Badge
      className={cn("gap-1.5 rounded-md px-2 py-0.5 text-[0.6875rem] font-medium", ADMIN_STATUS_BADGE_CLASSES[ORDER_STATUS_COLORS[status]])}
      variant="outline"
    >
      {t(status)}
    </Badge>
  )
}
