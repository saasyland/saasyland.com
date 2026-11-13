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

import { OAUTH_PROVIDERS } from "~/src/data/auth"

import { Button } from "~/src/presentation/components/shadcn/button"

import { Github, Google } from "~/src/presentation/components/custom/icons"

import { ROUTES } from "~/src/routes"

const ICONS = { [AUTH_PROVIDER.GITHUB]: Github, [AUTH_PROVIDER.GOOGLE]: Google } as const

const signInSocial = createClientOnlyFn((data: Parameters<typeof authClient.signIn.social>[0]) => authClient.signIn.social(data))

export const OAuthButtons = ({ intent = "sign-in" }: Readonly<{ intent?: "sign-in" | "sign-up" }>): JSX.Element => {
  const t = useTranslations("auth")

  const { hrefWithRedirect } = useAuthRedirect()

  const signInWithProvider = useMutation({
    mutationFn: (provider: (typeof OAUTH_PROVIDERS)[number]["id"]) =>
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
            {intent === "sign-up" ? t("oauth.continueWith", { provider: name }) : t(`oauth.${id}`)}
          </Button>
        )
      })}
    </div>
  )
}
