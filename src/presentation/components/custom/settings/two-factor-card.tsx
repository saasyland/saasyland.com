import { type JSX, useState } from "react"

import { useIsMutating, useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import { TWO_FACTOR_MUTATION_KEYS } from "~/src/modules/two-factor/two-factor.constants"

import { TWO_FACTOR_INTENT, type TwoFactorIntent } from "~/src/data/auth"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/src/presentation/components/shadcn/card"

import { TwoFactorDialog } from "~/src/presentation/components/custom/settings/two-factor-dialog"

export const TwoFactorCard = (): JSX.Element => {
  const t = useTranslations("auth.security.twoFactor")

  const [intent, setIntent] = useState<TwoFactorIntent>()

  const isEnabled = useSuspenseQuery(getCurrentSessionQuery).data?.user.twoFactorEnabled === true
  const hasPassword = useSuspenseQuery(listAccountsQuery).data.some(({ providerId }) => providerId === AUTH_PROVIDER.CREDENTIAL)
  const isPending = useIsMutating({ mutationKey: TWO_FACTOR_MUTATION_KEYS.ALL }) > 0

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <CardAction>
          <Badge variant={isEnabled ? "accent" : "neutral"}>{isEnabled ? t("on") : t("off")}</Badge>
        </CardAction>
      </CardHeader>
      {!hasPassword && (
        <CardContent>
          <p className="text-sm text-pretty text-muted-foreground">{t("needsPassword")}</p>
        </CardContent>
      )}
      {hasPassword && (
        <CardFooter className="flex-wrap justify-end gap-2">
          {isEnabled && (
            <Button
              isDisabled={isPending}
              onPress={() => {
                setIntent(TWO_FACTOR_INTENT.REGENERATE)
              }}
              size="sm"
              variant="outline"
            >
              {t("regenerate")}
            </Button>
          )}
          {isEnabled && (
            <Button
              isDisabled={isPending}
              onPress={() => {
                setIntent(TWO_FACTOR_INTENT.DISABLE)
              }}
              size="sm"
              variant="outline"
            >
              {t("disable")}
            </Button>
          )}
          {!isEnabled && (
            <Button
              isDisabled={isPending}
              onPress={() => {
                setIntent(TWO_FACTOR_INTENT.ENABLE)
              }}
              size="sm"
            >
              {t("enable")}
            </Button>
          )}
        </CardFooter>
      )}
      <TwoFactorDialog
        intent={intent}
        onClose={() => {
          setIntent(undefined)
        }}
      />
    </Card>
  )
}
