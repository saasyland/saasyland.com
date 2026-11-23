import type { JSX } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
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
  AlertDialogTrigger,
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Button } from "~/src/presentation/components/shadcn/button"

export const InvitationActions = ({ invitation }: { readonly invitation: Invitation["open"] }): JSX.Element => {
  const t = useTranslations("pages.admin.users.invitations")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

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
    <div className="flex justify-end gap-2">
      <Button
        aria-label={t("resendLabel", { email: invitation.email })}
        isPending={resend.isPending}
        onPress={() => {
          resend.mutate({ id: invitation.id })
        }}
        size="sm"
        variant="outline"
      >
        {t("resend")}
      </Button>
      <AlertDialogTrigger>
        <Button aria-label={t("revokeLabel", { email: invitation.email })} isPending={revoke.isPending} size="sm" variant="outline">
          {t("revoke")}
        </Button>
        <AlertDialog>
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
      </AlertDialogTrigger>
    </div>
  )
}
