import { type JSX, useState } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import type { CellContext } from "@tanstack/react-table"
import { EllipsisVertical } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { banUserMutation } from "~/src/modules/user/use-cases/ban-user"
import { unbanUserMutation } from "~/src/modules/user/use-cases/unban-user"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

import { DeleteUserDialog } from "~/src/presentation/components/custom/admin/users/delete-user-dialog"
import { ResetPasswordDialog } from "~/src/presentation/components/custom/admin/users/reset-password-dialog"
import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

export const UserRowActions = ({ row }: CellContext<DataTableFeatures, User["select"]>): JSX.Element => {
  const user = row.original
  const t = useTranslations("pages.admin.users.actions")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [isResetPasswordOpen, setIsResetPasswordOpen] = useState(false)

  const mutationCallbacks = (successKey: "banSuccess" | "unbanSuccess") => ({
    onError: (error: Error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.ALL })
      toast.success(t(`feedback.${successKey}`))
    },
  })

  const banUser = useMutation({ ...banUserMutation, ...mutationCallbacks("banSuccess") })
  const unbanUser = useMutation({ ...unbanUserMutation, ...mutationCallbacks("unbanSuccess") })
  const isPending = banUser.isPending || unbanUser.isPending

  return (
    <div className="flex justify-end">
      <DropdownMenuTrigger>
        <Button aria-label={t("row.menu")} className="size-8" size="icon" variant="ghost">
          <EllipsisVertical className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuItem>{t("row.edit")}</DropdownMenuItem>
          <DropdownMenuItem>{t("row.viewProfile")}</DropdownMenuItem>
          <DropdownMenuItem
            isDisabled={isPending}
            onAction={() => {
              setIsResetPasswordOpen(true)
            }}
          >
            {t("row.resetPassword")}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            isDisabled={isPending}
            onAction={() => {
              if (user.banned) {
                unbanUser.mutate({ userId: user.id })
                return
              }
              banUser.mutate({ userId: user.id })
            }}
          >
            {user.banned ? t("row.unban") : t("row.ban")}
          </DropdownMenuItem>
          <DropdownMenuItem
            isDisabled={isPending}
            onAction={() => {
              setIsDeleteOpen(true)
            }}
            variant="destructive"
          >
            {t("row.delete")}
          </DropdownMenuItem>
        </DropdownMenu>
      </DropdownMenuTrigger>

      <DeleteUserDialog isOpen={isDeleteOpen} onOpenChange={setIsDeleteOpen} user={user} />
      <ResetPasswordDialog isOpen={isResetPasswordOpen} onOpenChange={setIsResetPasswordOpen} user={user} />
    </div>
  )
}
