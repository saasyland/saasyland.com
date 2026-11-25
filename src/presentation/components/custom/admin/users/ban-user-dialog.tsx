import type { JSX } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { banUserMutation } from "~/src/modules/user/use-cases/ban-user"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/src/presentation/components/shadcn/alert-dialog"

interface BanUserDialogProps {
  readonly isOpen: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly user: User["select"]
}

export const BanUserDialog = ({ isOpen, onOpenChange, user }: BanUserDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.users.actions")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const banUser = useMutation({
    ...banUserMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.ALL }),
        queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.USER }),
      ])
      toast.success(t("feedback.banSuccess"))
    },
  })

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("banDialog.title")}</AlertDialogTitle>
        <AlertDialogDescription>{t("banDialog.description", { name: user.name })}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{t("banDialog.cancel")}</AlertDialogCancel>
        <AlertDialogAction
          isDisabled={banUser.isPending}
          onPress={() => {
            banUser.mutate({ userId: user.id })
          }}
          variant="destructive"
        >
          {t("banDialog.confirm")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialog>
  )
}
