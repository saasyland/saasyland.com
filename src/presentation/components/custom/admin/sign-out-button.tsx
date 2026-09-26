import type { JSX } from "react"

import { Loader2, LogOut } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { useSignOut } from "~/src/hooks/use-sign-out"

import { DropdownMenuItem } from "~/src/presentation/components/shadcn/dropdown-menu"

export const SignOutButton = (): JSX.Element => {
  const t = useTranslations("common")
  const { isPending, mutate } = useSignOut()

  return (
    <DropdownMenuItem
      isDisabled={isPending}
      onAction={() => {
        mutate()
      }}
      variant="destructive"
    >
      {isPending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
      {isPending ? t("signingOut") : t("signOut")}
    </DropdownMenuItem>
  )
}
