import type { JSX } from "react"

import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { ORDER_INVOICE_STATUS } from "~/src/modules/order/order.constants"
import type { Order } from "~/src/modules/order/order.types"
import { currentOrderInvoiceQuery } from "~/src/modules/order/use-cases/get-current-order-invoice"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

export const InvoiceButton = ({ order }: { readonly order: Pick<Order["currentOrder"], "id" | "invoiceNumber"> }): JSX.Element => {
  const t = useTranslations("pages.billing.orders")
  const errorMessage = useErrorMessage()

  const { isFetching, refetch } = useQuery({ ...currentOrderInvoiceQuery({ orderId: order.id }), enabled: false })

  const open = async (): Promise<void> => {
    const { data, error } = await refetch()

    if (error !== null) {
      toast.error(errorMessage(error))
      return
    }

    if (data?.status !== ORDER_INVOICE_STATUS.ISSUED) {
      toast.info(t("invoiceNotIssued"))
      return
    }

    globalThis.location.href = data.url
  }

  return (
    <Button
      aria-label={t("invoiceFor", { reference: order.invoiceNumber ?? order.id })}
      isDisabled={isFetching}
      onPress={() => {
        void open()
      }}
      size="sm"
      variant="outline"
    >
      {isFetching && <Spinner />}
      {t("invoice")}
    </Button>
  )
}
