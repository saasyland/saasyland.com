import { type JSX, useState } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { EllipsisVertical } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { ROLE_CODES, ROLE_VALUES } from "~/src/integrations/better-auth/auth.roles"
import { getCurrentSessionQuery, removeUserData } from "~/src/integrations/better-auth/auth.session"

import { impersonateUserMutation } from "~/src/modules/user/use-cases/impersonate-user"
import { setUserRoleMutation } from "~/src/modules/user/use-cases/set-user-role"
import { unbanUserMutation } from "~/src/modules/user/use-cases/unban-user"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import {
  DropdownMenu,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "~/src/presentation/components/shadcn/dropdown-menu"

import { BanUserDialog } from "~/src/presentation/components/custom/admin/users/ban-user-dialog"
import { DeleteUserDialog } from "~/src/presentation/components/custom/admin/users/delete-user-dialog"
import { EditUserDialog } from "~/src/presentation/components/custom/admin/users/edit-user-dialog"
import { ResetPasswordDialog } from "~/src/presentation/components/custom/admin/users/reset-password-dialog"

import { ROUTES } from "~/src/routes"

type UserDialog = "ban" | "delete" | "edit" | "resetPassword"

export const UserActions = ({ user }: { readonly user: User["select"] }): JSX.Element => {
  const t = useTranslations("pages.admin.users")
  const router = useRouter()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [dialog, setDialog] = useState<UserDialog>()
  const isSelf = useSuspenseQuery(getCurrentSessionQuery).data?.user.id === user.id
  const canImpersonate = !isSelf && !user.banned && user.role !== ROLE_CODES.ADMIN

  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const setRole = useMutation({
    ...setUserRoleMutation,
    onError,
    onSuccess: async (_result, { role }) => {
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.ALL })
      toast.success(t("actions.feedback.roleSuccess", { name: user.name, role: t(`filters.role.options.${role}`) }))
    },
  })
  const unbanUser = useMutation({
    ...unbanUserMutation,
    onError,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.ALL })
      toast.success(t("actions.feedback.unbanSuccess"))
    },
  })
  const impersonate = useMutation({
    ...impersonateUserMutation,
    onError,
    onSuccess: async () => {
      removeUserData(queryClient)
      router.clearCache()
      await router.navigate({ replace: true, to: ROUTES.APP })
      toast.success(t("actions.feedback.impersonateSuccess", { name: user.name }))
    },
  })

  const closeDialog = (): void => {
    setDialog(undefined)
  }

  return (
    <div className="flex justify-end">
      <DropdownMenuTrigger>
        <Button
          aria-label={t("actions.row.menu", { name: user.name })}
          className="size-8"
          isDisabled={setRole.isPending || unbanUser.isPending || impersonate.isPending}
          size="icon"
          variant="ghost"
        >
          <EllipsisVertical aria-hidden className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuItem
            onAction={() => {
              setDialog("edit")
            }}
          >
            {t("actions.row.edit")}
          </DropdownMenuItem>
          {!isSelf && (
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>{t("actions.row.changeRole")}</DropdownMenuSubTrigger>
              <DropdownMenuSubContent
                disabledKeys={[user.role]}
                onAction={(role) => {
                  setRole.mutate({ role: userZodSchemas.setUserRole.shape.role.parse(role), userId: user.id })
                }}
                selectedKeys={[user.role]}
                selectionMode="single"
              >
                {ROLE_VALUES.map((role) => (
                  <DropdownMenuItem id={role} key={role}>
                    {t(`filters.role.options.${role}`)}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          )}
          <DropdownMenuItem
            onAction={() => {
              setDialog("resetPassword")
            }}
          >
            {t("actions.row.resetPassword")}
          </DropdownMenuItem>
          {canImpersonate && (
            <DropdownMenuItem
              onAction={() => {
                impersonate.mutate({ userId: user.id })
              }}
            >
              {t("actions.row.impersonate")}
            </DropdownMenuItem>
          )}
          {!isSelf && <DropdownMenuSeparator />}
          {!isSelf && user.banned && (
            <DropdownMenuItem
              onAction={() => {
                unbanUser.mutate({ userId: user.id })
              }}
            >
              {t("actions.row.unban")}
            </DropdownMenuItem>
          )}
          {!isSelf && !user.banned && (
            <DropdownMenuItem
              onAction={() => {
                setDialog("ban")
              }}
              variant="destructive"
            >
              {t("actions.row.ban")}
            </DropdownMenuItem>
          )}
          {!isSelf && (
            <DropdownMenuItem
              onAction={() => {
                setDialog("delete")
              }}
              variant="destructive"
            >
              {t("actions.row.delete")}
            </DropdownMenuItem>
          )}
        </DropdownMenu>
      </DropdownMenuTrigger>

      <EditUserDialog isOpen={dialog === "edit"} onOpenChange={closeDialog} user={user} />
      <ResetPasswordDialog isOpen={dialog === "resetPassword"} onOpenChange={closeDialog} user={user} />
      <BanUserDialog isOpen={dialog === "ban"} onOpenChange={closeDialog} user={user} />
      <DeleteUserDialog isOpen={dialog === "delete"} onOpenChange={closeDialog} user={user} />
    </div>
  )
}

export const UserRowActions = ({ row }: { readonly row: User["select"] }): JSX.Element => <UserActions user={row} />
