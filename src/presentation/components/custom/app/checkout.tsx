import type { JSX, ReactNode } from "react"

import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { LICENSE_MUTATION_KEYS, LICENSE_QUERY_KEYS } from "~/src/modules/license/license.constants"
import type { LicenseTier } from "~/src/modules/license/license.schema"
import { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { ROUTES } from "~/src/routes"

const LINK_CLASSNAME = "underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"

const AGREEMENT_TAGS = {
  licence: (chunks: ReactNode) => (
    <Link className={LINK_CLASSNAME} to={ROUTES.LICENCE}>
      {chunks}
    </Link>
  ),
  refunds: (chunks: ReactNode) => (
    <Link className={LINK_CLASSNAME} to={ROUTES.REFUNDS}>
      {chunks}
    </Link>
  ),
  terms: (chunks: ReactNode) => (
    <Link className={LINK_CLASSNAME} to={ROUTES.TERMS}>
      {chunks}
    </Link>
  ),
}

interface CheckoutButtonProps {
  readonly children: ReactNode
  readonly featured: boolean
  readonly tier: LicenseTier
}

export const CheckoutButton = ({ children, featured, tier }: CheckoutButtonProps): JSX.Element => {
  const t = useTranslations("pages.license.buy")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const isStarting = useIsMutating({ mutationKey: LICENSE_MUTATION_KEYS.START_CHECKOUT }) > 0

  const { isPending, mutate } = useMutation({
    ...startCheckoutMutation,
    onError: async (error) => {
      toast.error(errorMessage(error))
      await queryClient.invalidateQueries({ queryKey: LICENSE_QUERY_KEYS.ALL })
    },
    onSuccess: async ({ url }) => {
      await queryClient.invalidateQueries({ queryKey: LICENSE_QUERY_KEYS.ALL })
      globalThis.location.href = url
    },
  })

  return (
    <Button
      className="h-11 w-full px-5 text-body-sm font-semibold"
      isDisabled={isStarting}
      onPress={() => {
        mutate({ locale: getCurrentLocale(), tier })
      }}
      variant={featured ? "default" : "outline"}
    >
      {isPending && <Spinner />}
      {isPending ? t("pending") : children}
    </Button>
  )
}

export const CheckoutAgreement = (): JSX.Element => {
  const t = useTranslations("pages.license.buy")

  return <p className="text-xs leading-relaxed text-pretty text-muted-foreground">{t.rich("agreement", AGREEMENT_TAGS)}</p>
}
