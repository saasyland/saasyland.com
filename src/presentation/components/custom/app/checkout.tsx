import type { JSX, ReactNode } from "react"

import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query"
import { Link, useRouterState } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { LICENSE_MUTATION_KEYS, LICENSE_QUERY_KEYS, type LicenseTier } from "~/src/modules/license/license.constants"
import { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useErrorMessage } from "~/src/hooks/use-error-message"

import { isPolarCheckoutTranslated } from "~/src/data/polar"
import { REFUND_TERMS } from "~/src/data/refunds"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const LINK_CLASSNAME = "underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"

const REFUND_VALUES = { days: REFUND_TERMS.WITHDRAWAL_DAYS }

const LEGAL_TAGS = {
  ...REFUND_VALUES,
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
  const returnPath = useRouterState({ select: ({ location }) => location.publicHref })
  const isStarting = useIsMutating({ mutationKey: LICENSE_MUTATION_KEYS.START_CHECKOUT }) > 0

  const { redirect } = useAuthRedirect()

  const refreshLicense = () => queryClient.invalidateQueries({ queryKey: LICENSE_QUERY_KEYS.ALL })

  const { isPending, mutate } = useMutation({
    ...startCheckoutMutation,
    onError: async (error) => {
      toast.error(errorMessage(error))
      await refreshLicense()
    },
    onSuccess: async (checkout) => {
      await refreshLicense()
      if ("alreadyActive" in checkout) {
        toast.error(t("alreadyActive", { email: CONTACT_EMAIL }))
        return
      }
      globalThis.location.href = checkout.url
    },
  })

  return (
    <Button
      className="h-11 w-full px-5 text-body-sm font-semibold"
      isDisabled={isStarting && !isPending}
      isPending={isPending}
      onPress={() => {
        mutate({ locale: getCurrentLocale(), redirect, returnPath, tier })
      }}
      variant={featured ? "default" : "outline"}
    >
      {isPending && <Spinner />}
      {isPending ? t("pending") : children}
    </Button>
  )
}

export const CheckoutNotice = (): JSX.Element => {
  const t = useTranslations("pages.license.buy.notice")

  return (
    <div className="flex max-w-[72ch] flex-col gap-1.5 text-xs leading-relaxed text-pretty text-muted-foreground">
      <p>
        {t("consent", REFUND_VALUES)}
        {!isPolarCheckoutTranslated(getCurrentLocale()) && ` ${t("english")}`}
      </p>
      <p>{t.rich("refund", LEGAL_TAGS)}</p>
      <p>{t.rich("agreement", LEGAL_TAGS)}</p>
    </div>
  )
}
