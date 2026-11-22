import type { JSX } from "react"

import { useMutation } from "@tanstack/react-query"
import { createClientOnlyFn } from "@tanstack/react-start"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { authClient } from "~/src/integrations/better-auth/auth.client"
import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { authErrorKey } from "~/src/integrations/better-auth/auth.errors"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useLastLoginMethod } from "~/src/hooks/use-last-login-method"

import { OAUTH_PROVIDERS } from "~/src/data/auth"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"

import { Github, Google } from "~/src/presentation/components/custom/icons"

import { ROUTES } from "~/src/routes"

const ICONS = { [AUTH_PROVIDER.GITHUB]: Github, [AUTH_PROVIDER.GOOGLE]: Google } as const

type Provider = (typeof OAUTH_PROVIDERS)[number]["id"]

const signInSocial = createClientOnlyFn((data: Parameters<typeof authClient.signIn.social>[0]) => authClient.signIn.social(data))

const useSocialSignIn = (redirect?: string) => {
  const t = useTranslations("auth")

  const { hrefWithRedirect } = useAuthRedirect(redirect)

  return useMutation({
    mutationFn: (provider: Provider) =>
      signInSocial({
        callbackURL: hrefWithRedirect(ROUTES.AUTH_CALLBACK),
        errorCallbackURL: hrefWithRedirect(ROUTES.SIGN_IN),
        fetchOptions: {
          onError: (context) => {
            toast.error(t(`errors.${authErrorKey(context.error)}`))
          },
          onSuccess: () => {
            toast.success(t("oauth.success"))
          },
        },
        provider,
      }),
  })
}

export const LastUsedBadge = (): JSX.Element => {
  const t = useTranslations("auth.oauth")

  return <Badge className="ml-auto">{t("lastUsed")}</Badge>
}

export const OAuthButtons = ({ redirect }: { readonly redirect?: string }): JSX.Element => {
  const t = useTranslations("auth")
  const { isLastUsed } = useLastLoginMethod()
  const signInWithProvider = useSocialSignIn(redirect)

  return (
    <div className="flex flex-col gap-3">
      {OAUTH_PROVIDERS.map(({ id, name }) => {
        const Icon = ICONS[id]
        const isPending = signInWithProvider.isPending && signInWithProvider.variables === id

        return (
          <Button
            className="h-11 w-full justify-start gap-2 bg-transparent px-4 text-body-sm text-foreground transition-[background-color,border-color,color,transform] dark:border-border dark:bg-transparent dark:hover:bg-muted"
            isPending={isPending}
            key={id}
            onPress={() => {
              signInWithProvider.mutate(id)
            }}
            variant="outline"
          >
            {isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
            {!isPending && <Icon className="size-4" />}
            {t("oauth.continueWith", { provider: name })}
            {isLastUsed(id) && <LastUsedBadge />}
          </Button>
        )
      })}
    </div>
  )
}

export const OAuthLinks = (): JSX.Element => {
  const t = useTranslations("auth")
  const signInWithProvider = useSocialSignIn()

  return (
    <>
      {OAUTH_PROVIDERS.map(({ id, name }) => (
        <li key={id}>
          <Button
            className="h-auto min-h-10 border-0 px-0 text-body-sm font-medium text-foreground underline underline-offset-4"
            isPending={signInWithProvider.isPending && signInWithProvider.variables === id}
            onPress={() => {
              signInWithProvider.mutate(id)
            }}
            variant="link"
          >
            {t("oauth.continueWith", { provider: name })}
          </Button>
        </li>
      ))}
    </>
  )
}
