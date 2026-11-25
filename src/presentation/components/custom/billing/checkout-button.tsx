import { type JSX, type ReactNode, useRef } from "react"

import { type MutationKey, type UseMutationOptions, useIsMutating, useMutation } from "@tanstack/react-query"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import type { Order } from "~/src/modules/order/order.types"
import { startedCheckoutSchema } from "~/src/modules/order/order.zod"
import { startCheckoutMutation } from "~/src/modules/order/use-cases/start-checkout"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { openCheckoutOverlay } from "~/src/lib/checkout-overlay"

import { Button, type ButtonVariantProps } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { ROUTES } from "~/src/routes"

type CheckoutPlace = Pick<Order["startCheckout"], "locale" | "returnPath">

type CheckoutMutation<Answer, Variables> = Pick<UseMutationOptions<Answer, Error, Variables>, "mutationFn" | "onError" | "onSuccess"> & {
  readonly mutationKey: MutationKey
}

interface PolarCheckoutButtonProps<Answer, Variables> {
  readonly checkout: CheckoutMutation<Answer, Variables>
  readonly children: ReactNode
  readonly className?: string
  readonly onPaid: (checkoutId: string) => void
  readonly variables: (place: CheckoutPlace) => Variables
  readonly variant?: ButtonVariantProps["variant"]
}

export const PolarCheckoutButton = <Answer, Variables>({
  checkout,
  children,
  onPaid,
  variables,
  ...look
}: PolarCheckoutButtonProps<Answer, Variables>): JSX.Element => {
  const t = useTranslations("components.custom.checkout-button")
  const errorMessage = useErrorMessage()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const returnPath = useRouterState({ select: ({ location }) => location.publicHref })
  const isStarting = useIsMutating({ mutationKey: checkout.mutationKey }) > 0

  const { isPending, mutate } = useMutation({
    ...checkout,
    onSettled: async (answer, error) => {
      const started = startedCheckoutSchema.safeParse(answer)

      if (error !== null) {
        toast.error(errorMessage(error))
      }

      if (started.success) {
        await openCheckoutOverlay({
          onClose: () => {
            buttonRef.current?.focus()
          },
          onPaid: () => {
            onPaid(started.data.checkoutId)
          },
          onUnavailable: () => {
            globalThis.location.href = started.data.url
          },
          title: t("overlay"),
          url: started.data.url,
        })
      }
    },
  })

  return (
    <Button
      {...look}
      isDisabled={isStarting && !isPending}
      isPending={isPending}
      onPress={() => {
        mutate(variables({ locale: getCurrentLocale(), returnPath }))
      }}
      ref={buttonRef}
    >
      {isPending && <Spinner />}
      {isPending ? t("pending") : children}
    </Button>
  )
}

interface CheckoutButtonProps {
  readonly children: ReactNode
  readonly productId: string
}

export const CheckoutButton = ({ children, productId }: CheckoutButtonProps): JSX.Element => {
  const navigate = useNavigate()

  return (
    <PolarCheckoutButton
      checkout={startCheckoutMutation}
      onPaid={(checkoutId) => {
        void navigate({ search: { checkoutId }, to: ROUTES.APP.BILLING })
      }}
      variables={(place) => ({ ...place, productId, successPath: ROUTES.APP.BILLING })}
    >
      {children}
    </PolarCheckoutButton>
  )
}
