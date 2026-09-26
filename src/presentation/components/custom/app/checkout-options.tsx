import type { JSX, ReactNode } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { LICENSE_QUERY_KEYS } from "~/src/modules/license/license.constants"
import { startCheckoutMutation } from "~/src/modules/license/use-cases/start-checkout"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { APP_LICENSE_TIERS } from "~/src/data/app"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
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

export const CheckoutOptions = (): JSX.Element => {
  const t = useTranslations("pages.license.buy")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const { isPending, mutate } = useMutation({
    ...startCheckoutMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async ({ url }) => {
      await queryClient.invalidateQueries({ queryKey: LICENSE_QUERY_KEYS.ALL })
      globalThis.location.href = url
    },
  })

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          {APP_LICENSE_TIERS.map((tier) => (
            <Button
              isDisabled={isPending}
              key={tier}
              onPress={() => {
                mutate({ tier })
              }}
              variant="outline"
            >
              {isPending && <Spinner />}
              {isPending ? t("pending") : t(tier)}
            </Button>
          ))}
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{t.rich("agreement", AGREEMENT_TAGS)}</p>
      </CardContent>
    </Card>
  )
}
