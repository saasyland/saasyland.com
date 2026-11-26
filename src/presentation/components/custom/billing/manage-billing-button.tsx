import type { JSX } from "react"

import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { createClientOnlyFn } from "@tanstack/react-start"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { authErrorKey } from "~/src/integrations/better-auth/auth.errors"

import { currentOrdersQuery } from "~/src/modules/order/use-cases/get-current-orders"
import { currentSubscriptionsQuery } from "~/src/modules/subscription/use-cases/get-current-subscriptions"

import { useEmailVerification } from "~/src/hooks/use-email-verification"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { ROUTES } from "~/src/routes"

const openCustomerPortal = createClientOnlyFn(() => authClient.$fetch(ROUTES.API.AUTH.POLAR.CUSTOMER_PORTAL, { method: "GET" }))

const PortalButton = (): JSX.Element => {
  const t = useTranslations()

  const { isPending, mutate } = useMutation({
    mutationFn: openCustomerPortal,
    onSuccess: ({ error }) => {
      if (error !== null) {
        toast.error(t(`auth.errors.${authErrorKey(error)}`))
      }
    },
  })

  return (
    <Button
      isDisabled={isPending}
      onPress={() => {
        mutate()
      }}
      size="sm"
      variant="outline"
    >
      {isPending && <Spinner />}
      {t("pages.billing.manage")}
    </Button>
  )
}

export const ManageBillingButton = (): JSX.Element | undefined => {
  const { orders } = useSuspenseQuery(currentOrdersQuery).data
  const { subscriptions } = useSuspenseQuery(currentSubscriptionsQuery).data
  const { unconfirmedEmail } = useEmailVerification()

  if (unconfirmedEmail !== undefined || orders.length + subscriptions.length === 0) {
    return
  }

  return <PortalButton />
}
