import type { JSX } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useRouter, useRouterState } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { CircleAlert } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { authErrorKey, authErrorKeyFromSearch } from "~/src/integrations/better-auth/auth.errors"
import { settingsSearchSchema } from "~/src/integrations/better-auth/auth.zod"

import { ACCOUNT_QUERY_KEYS } from "~/src/modules/account/account.constants"
import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import { unlinkAccountMutation } from "~/src/modules/account/use-cases/unlink-account"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { OAUTH_PROVIDERS, SETTINGS_TAB } from "~/src/data/auth"

import { Alert, AlertDescription } from "~/src/presentation/components/shadcn/alert"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { Github, Google } from "~/src/presentation/components/custom/icons"

const ICONS = { [AUTH_PROVIDER.GITHUB]: Github, [AUTH_PROVIDER.GOOGLE]: Google } as const

type Provider = (typeof OAUTH_PROVIDERS)[number]["id"]

const linkSocial = createClientOnlyFn((data: Parameters<typeof authClient.linkSocial>[0]) => authClient.linkSocial(data))

export const ConnectedAccountsCard = (): JSX.Element => {
  const t = useTranslations()
  const router = useRouter()

  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const accounts = useSuspenseQuery(listAccountsQuery).data
  const linkError = useRouterState({ select: ({ location }) => settingsSearchSchema.parse(location.search).error })

  const connect = useMutation({
    mutationFn: (provider: Provider) => {
      const callbackURL = router.buildLocation({ search: { tab: SETTINGS_TAB.SECURITY }, to: "." }).publicHref

      return linkSocial({
        callbackURL,
        errorCallbackURL: callbackURL,
        fetchOptions: {
          onError: (context) => {
            toast.error(t(`auth.errors.${authErrorKey(context.error)}`))
          },
        },
        provider,
      })
    },
  })

  const disconnect = useMutation({
    ...unlinkAccountMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.ALL }),
  })

  const errorKey = authErrorKeyFromSearch(linkError)
  const isLastMethod = accounts.length === 1

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("auth.security.accounts.title")}</h2>
        </CardTitle>
        <CardDescription>{t("auth.security.accounts.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-0">
        {errorKey !== undefined && (
          <Alert className="mx-(--card-spacing) w-auto" variant="destructive">
            <CircleAlert aria-hidden />
            <AlertDescription>{t(`auth.errors.${errorKey}`)}</AlertDescription>
          </Alert>
        )}
        <ul className="divide-y divide-border">
          {OAUTH_PROVIDERS.map(({ id, name }) => {
            const Icon = ICONS[id]
            const account = accounts.find(({ providerId }) => providerId === id)

            return (
              <li className="flex items-center justify-between gap-4 px-(--card-spacing) py-3" key={id}>
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-foreground">
                    <Icon className="size-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{name}</p>
                    <p className="text-spec text-muted-foreground">
                      {account === undefined && t("auth.security.accounts.notConnected")}
                      {account !== undefined && t("auth.security.accounts.connected", { date: account.createdAt })}
                    </p>
                  </div>
                </div>
                {account === undefined && (
                  <Button
                    aria-label={t("auth.security.accounts.connectLabel", { provider: name })}
                    className="shrink-0"
                    isPending={connect.isPending && connect.variables === id}
                    onPress={() => {
                      connect.mutate(id)
                    }}
                    size="sm"
                    variant="outline"
                  >
                    {t("auth.security.accounts.connect")}
                  </Button>
                )}
                {account !== undefined && !isLastMethod && (
                  <Button
                    aria-label={t("auth.security.accounts.disconnectLabel", { provider: name })}
                    className="shrink-0"
                    isPending={disconnect.isPending && disconnect.variables.accountId === account.id}
                    onPress={() => {
                      disconnect.mutate(
                        { accountId: account.id },
                        {
                          onSuccess: () => {
                            toast.success(t("auth.security.accounts.disconnected", { provider: name }))
                          },
                        },
                      )
                    }}
                    size="sm"
                    variant="outline"
                  >
                    {t("auth.security.accounts.disconnect")}
                  </Button>
                )}
              </li>
            )
          })}
        </ul>
        {isLastMethod && accounts.some(({ providerId }) => providerId !== AUTH_PROVIDER.CREDENTIAL) && (
          <p className="px-(--card-spacing) text-sm text-pretty text-muted-foreground">{t("auth.security.accounts.lastMethod")}</p>
        )}
      </CardContent>
    </Card>
  )
}
