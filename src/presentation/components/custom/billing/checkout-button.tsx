import { type JSX, type ReactNode, useRef } from "react"

import { useIsMutating, useMutation } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import { startCheckoutMutation } from "~/src/modules/order/use-cases/start-checkout"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { openCheckoutOverlay } from "~/src/lib/checkout-overlay"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import * as ROUTES from "~/src/routes"

interface CheckoutButtonProps {
  readonly children: ReactNode
  readonly productId: string
}

export const CheckoutButton = ({ children, productId }: CheckoutButtonProps): JSX.Element => {
  const t = useTranslations("components.custom.checkout-button")
  const errorMessage = useErrorMessage()
  const navigate = useNavigate()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const returnPath = useRouterState({ select: ({ location }) => location.publicHref })
  const isStarting = useIsMutating({ mutationKey: ORDER_MUTATION_KEYS.START_CHECKOUT }) > 0

  const { isPending, mutate } = useMutation({
    ...startCheckoutMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: (checkout) =>
      openCheckoutOverlay({
        onClose: () => {
          buttonRef.current?.focus()
        },
        onPaid: () => {
          void navigate({ search: { checkoutId: checkout.checkoutId }, to: ROUTES.APP_BILLING })
        },
        onUnavailable: () => {
          globalThis.location.href = checkout.url
        },
        title: t("overlay"),
        url: checkout.url,
      }),
  })

  return (
    <Button
      isDisabled={isStarting && !isPending}
      isPending={isPending}
      onPress={() => {
        mutate({ locale: getCurrentLocale(), productId, returnPath, successPath: ROUTES.APP_BILLING })
      }}
      ref={buttonRef}
    >
      {isPending && <Spinner />}
      {isPending ? t("pending") : children}
    </Button>
  )
}
