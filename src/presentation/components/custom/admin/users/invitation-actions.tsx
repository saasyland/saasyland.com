import { type JSX, useState } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { EllipsisVertical } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { INVITATION_QUERY_KEYS } from "~/src/modules/invitation/invitation.constants"
import type { Invitation } from "~/src/modules/invitation/invitation.types"
import { resendInvitationMutation } from "~/src/modules/invitation/use-cases/resend-invitation"
import { revokeInvitationMutation } from "~/src/modules/invitation/use-cases/revoke-invitation"

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
import { Button } from "~/src/presentation/components/shadcn/button"
import { DropdownMenu, DropdownMenuItem, DropdownMenuTrigger } from "~/src/presentation/components/shadcn/dropdown-menu"

export const InvitationActions = ({ invitation }: { readonly invitation: Invitation["open"] }): JSX.Element => {
  const t = useTranslations("pages.admin.users.invitations")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const [isRevoking, setRevoking] = useState(false)

  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const resend = useMutation({
    ...resendInvitationMutation,
    onError,
    onSuccess: async ({ email }) => {
      await queryClient.invalidateQueries({ queryKey: INVITATION_QUERY_KEYS.ALL })
      toast.success(t("feedback.resent", { email }))
    },
  })
  const revoke = useMutation({
    ...revokeInvitationMutation,
    onError,
    onSuccess: async ({ email }) => {
      await queryClient.invalidateQueries({ queryKey: INVITATION_QUERY_KEYS.ALL })
      toast.success(t("feedback.revoked", { email }))
    },
  })

  return (
    <div className="flex justify-end">
      <DropdownMenuTrigger>
        <Button
          aria-label={t("menu", { email: invitation.email })}
          className="size-8"
          isPending={resend.isPending || revoke.isPending}
          size="icon"
          variant="ghost"
        >
          <EllipsisVertical aria-hidden className="size-4" />
        </Button>
        <DropdownMenu>
          <DropdownMenuItem
            aria-label={t("resendLabel", { email: invitation.email })}
            onAction={() => {
              resend.mutate({ id: invitation.id })
            }}
            textValue={t("resend")}
          >
            {t("resend")}
          </DropdownMenuItem>
          <DropdownMenuItem
            aria-label={t("revokeLabel", { email: invitation.email })}
            onAction={() => {
              setRevoking(true)
            }}
            textValue={t("revoke")}
            variant="destructive"
          >
            {t("revoke")}
          </DropdownMenuItem>
        </DropdownMenu>
      </DropdownMenuTrigger>
      <AlertDialog isOpen={isRevoking} onOpenChange={setRevoking}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("revokeDialog.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("revokeDialog.description", { email: invitation.email })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("revokeDialog.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onPress={() => {
              revoke.mutate({ id: invitation.id })
            }}
            variant="destructive"
          >
            {t("revokeDialog.confirm")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  )
}

export const InvitationRowActions = ({ row }: { readonly row: Invitation["open"] }): JSX.Element => <InvitationActions invitation={row} />
