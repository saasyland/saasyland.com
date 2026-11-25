import { type JSX, type ReactNode, useEffect, useState } from "react"

import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { CircleCheck, Clock } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type OrderStatus, REVENUE_ORDER_STATUSES } from "~/src/modules/order/order.constants"
import type { Order } from "~/src/modules/order/order.types"
import { currentOrdersQuery } from "~/src/modules/order/use-cases/get-current-orders"
import { SUBSCRIPTION_QUERY_KEYS } from "~/src/modules/subscription/subscription.constants"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { CONTACT_EMAIL } from "~/src/presentation/branding"

export const CHECKOUT_CONFIRMATION_POLL_MS = 2000

export const CHECKOUT_CONFIRMATION_TIMEOUT_MS = 60_000

const PAID_STATUSES: ReadonlySet<OrderStatus> = new Set(REVENUE_ORDER_STATUSES)

const EMAIL_TAGS = {
  email: CONTACT_EMAIL,
  mail: (chunks: ReactNode) => (
    <a
      className="font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      href={`mailto:${CONTACT_EMAIL}`}
    >
      {chunks}
    </a>
  ),
}

const hasPaidOrder = (current: Order["currentOrders"] | undefined, checkoutId: string): boolean =>
  current?.orders.some((order) => order.checkoutId === checkoutId && PAID_STATUSES.has(order.status)) === true

const ConfirmationPanel = ({ children, icon }: Readonly<{ children: ReactNode; icon: ReactNode }>): JSX.Element => (
  <section className="flex items-start gap-5 rounded-lg border border-border bg-card p-6 md:p-8" role="status">
    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full border border-ring/40 bg-ring/10 text-ring">
      {icon}
    </span>
    <div className="flex min-w-0 flex-col items-start gap-2">{children}</div>
  </section>
)

export const CheckoutConfirmation = ({ checkoutId }: { readonly checkoutId: string }): JSX.Element => {
  const t = useTranslations("pages.billing.confirmation")
  const queryClient = useQueryClient()

  const [hasTimedOut, setHasTimedOut] = useState(false)

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      setHasTimedOut(true)
    }, CHECKOUT_CONFIRMATION_TIMEOUT_MS)
    return () => {
      globalThis.clearTimeout(timeoutId)
    }
  }, [])

  const { data, isRefetching, refetch } = useSuspenseQuery({
    ...currentOrdersQuery,
    refetchInterval: ({ state }) => {
      if (hasTimedOut || hasPaidOrder(state.data, checkoutId)) {
        return false
      }
      return CHECKOUT_CONFIRMATION_POLL_MS
    },
  })

  const isConfirmed = hasPaidOrder(data, checkoutId)

  useEffect(() => {
    if (isConfirmed) {
      void queryClient.invalidateQueries({ queryKey: SUBSCRIPTION_QUERY_KEYS.ALL })
    }
  }, [isConfirmed, queryClient])

  if (isConfirmed) {
    return (
      <ConfirmationPanel icon={<CircleCheck className="size-4.5" strokeWidth={2.25} />}>
        <h2 className="text-title text-balance text-foreground">{t("confirmed.title")}</h2>
        <p className="max-w-[60ch] text-body-sm text-pretty text-muted-foreground">{t("confirmed.body")}</p>
      </ConfirmationPanel>
    )
  }

  if (hasTimedOut) {
    return (
      <ConfirmationPanel icon={<Clock className="size-4.5" strokeWidth={2.25} />}>
        <h2 className="text-title text-balance text-foreground">{t("delayed.title")}</h2>
        <p className="max-w-[60ch] text-body-sm text-pretty text-muted-foreground">{t.rich("delayed.body", EMAIL_TAGS)}</p>
        <p className="text-body-sm text-muted-foreground">
          {t("delayed.reference")} <code className="font-mono text-spec break-all text-foreground select-all">{checkoutId}</code>
        </p>
        <Button
          className="mt-3"
          isDisabled={isRefetching}
          onPress={() => {
            void refetch()
          }}
          size="lg"
          variant="outline"
        >
          {isRefetching && <Spinner />}
          {t("delayed.retry")}
        </Button>
      </ConfirmationPanel>
    )
  }

  return (
    <ConfirmationPanel icon={<Spinner className="size-4.5" />}>
      <h2 className="text-title text-balance text-foreground">{t("confirming.title")}</h2>
      <p className="max-w-[60ch] text-body-sm text-pretty text-muted-foreground">{t("confirming.body")}</p>
    </ConfirmationPanel>
  )
}
