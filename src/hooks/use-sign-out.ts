import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { signOutUserMutation } from "~/src/modules/account/use-cases/sign-out-user"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { ROUTES } from "~/src/routes"

export const useSignOut = () => {
  const t = useTranslations("common")
  const queryClient = useQueryClient()
  const router = useRouter()
  const errorMessage = useErrorMessage()

  return useMutation({
    ...signOutUserMutation,
    onError: (error) => toast.error(errorMessage(error)),
    onSuccess: async () => {
      queryClient.clear()
      await router.navigate({ replace: true, to: ROUTES.SIGN_IN })
      router.clearCache()
      toast.success(t("signedOut"))
    },
  })
}
