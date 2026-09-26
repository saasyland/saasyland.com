import type { JSX } from "react"

import { LogOut } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { useSignOut } from "~/src/hooks/use-sign-out"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

export const SignOutButton = (): JSX.Element => {
  const t = useTranslations("common")
  const { isPending, mutate } = useSignOut()

  return (
    <Button
      aria-label={isPending ? t("signingOut") : t("signOut")}
      className="shrink-0 text-muted-foreground"
      isDisabled={isPending}
      onPress={() => {
        mutate()
      }}
      size="icon-sm"
      variant="ghost"
    >
      {isPending && <Spinner />}
      {!isPending && <LogOut aria-hidden strokeWidth={1.5} />}
    </Button>
  )
}
