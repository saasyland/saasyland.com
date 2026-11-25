import type { JSX } from "react"

import { useMutation } from "@tanstack/react-query"
import { createClientOnlyFn } from "@tanstack/react-start"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { authErrorKey } from "~/src/integrations/better-auth/auth.errors"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import * as ROUTES from "~/src/routes"

const openCustomerPortal = createClientOnlyFn(() => authClient.$fetch(ROUTES.API_AUTH_POLAR.CUSTOMER_PORTAL, { method: "GET" }))

export const ManageBillingButton = (): JSX.Element => {
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
