import type { JSX } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { UserRoundX } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery, removeUserData } from "~/src/integrations/better-auth/auth.session"

import { stopImpersonatingUserMutation } from "~/src/modules/user/use-cases/stop-impersonating-user"
import type { User } from "~/src/modules/user/user.types"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"

const ImpersonatedUser = ({ user }: { readonly user: Pick<User["select"], "email" | "id" | "name"> }): JSX.Element => {
  const t = useTranslations("components.custom.impersonation-banner")
  const router = useRouter()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const stopImpersonating = useMutation({
    ...stopImpersonatingUserMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      removeUserData(queryClient)
      router.clearCache()
      await router.navigate({ params: { userId: user.id }, replace: true, to: "/admin/users/$userId" })
      toast.success(t("stopped", { name: user.name }))
    },
  })

  return (
    <section
      aria-label={t("label")}
      className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-amber-500/30 bg-amber-500/10 px-3 py-2 md:px-5"
    >
      <p className="text-body-sm text-foreground">{t("message", { email: user.email, name: user.name })}</p>
      <Button
        className="h-8 gap-2"
        isPending={stopImpersonating.isPending}
        onPress={() => {
          stopImpersonating.mutate()
        }}
        size="sm"
        variant="outline"
      >
        <UserRoundX aria-hidden className="size-4" />
        {t("stop")}
      </Button>
    </section>
  )
}

export const ImpersonationBanner = (): JSX.Element | undefined => {
  const current = useSuspenseQuery(getCurrentSessionQuery).data

  if (current === null || typeof current.session.impersonatedBy !== "string") {
    return undefined
  }

  return <ImpersonatedUser user={current.user} />
}
