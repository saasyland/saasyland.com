import type { JSX } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { deleteUserMutation } from "~/src/modules/user/use-cases/delete-user"
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

interface DeleteUserDialogProps {
  readonly isOpen: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly user: User["select"]
}

export const DeleteUserDialog = ({ isOpen, onOpenChange, user }: DeleteUserDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.users.actions")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const deleteUser = useMutation({
    ...deleteUserMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.ALL })
      toast.success(t("feedback.deleteSuccess"))
    },
  })

  return (
    <AlertDialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("deleteDialog.title")}</AlertDialogTitle>
        <AlertDialogDescription>{t("deleteDialog.description", { name: user.name })}</AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{t("deleteDialog.cancel")}</AlertDialogCancel>
        <AlertDialogAction
          isDisabled={deleteUser.isPending}
          onPress={() => {
            deleteUser.mutate(
              { userId: user.id },
              {
                onSuccess: () => {
                  onOpenChange(false)
                },
              },
            )
          }}
          variant="destructive"
        >
          {t("deleteDialog.confirm")}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialog>
  )
}
