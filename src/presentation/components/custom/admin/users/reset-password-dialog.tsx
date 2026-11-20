import { type JSX, useId } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { setUserPasswordMutation } from "~/src/modules/user/use-cases/set-user-password"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/src/presentation/components/shadcn/dialog"
import { FieldGroup } from "~/src/presentation/components/shadcn/field"

import { UserTextField } from "~/src/presentation/components/custom/admin/users/user-text-field"

interface ResetPasswordDialogProps {
  readonly isOpen: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly user: User["select"]
}

export const ResetPasswordDialog = ({ isOpen, onOpenChange, user }: ResetPasswordDialogProps): JSX.Element => {
  const t = useTranslations("pages.admin.users.actions")
  const passwordId = useId()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const setPassword = useMutation({
    ...setUserPasswordMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: USER_QUERY_KEYS.ALL }),
  })

  const form = useForm({
    defaultValues: { newPassword: "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ formApi, value }) => {
      setPassword.mutate(
        { newPassword: value.newPassword, userId: user.id },
        {
          onSuccess: () => {
            toast.success(t("feedback.resetPasswordSuccess"))
            formApi.reset()
            onOpenChange(false)
          },
        },
      )
    },
    validators: { onChange: userZodSchemas.setUserPasswordForm },
  })

  return (
    <Dialog isOpen={isOpen} onOpenChange={onOpenChange}>
      <DialogHeader>
        <DialogTitle>{t("resetPasswordDialog.title")}</DialogTitle>
        <DialogDescription>{t("resetPasswordDialog.description", { name: user.name })}</DialogDescription>
      </DialogHeader>

      <form
        noValidate
        onSubmit={(event) => {
          void submitForm(event, form)
        }}
      >
        <FieldGroup>
          <form.Field name="newPassword">
            {(field) => (
              <UserTextField
                autoComplete="new-password"
                field={field}
                id={passwordId}
                label={t("resetPasswordDialog.password")}
                type="password"
              />
            )}
          </form.Field>
          <DialogFooter>
            <Button
              onPress={() => {
                onOpenChange(false)
              }}
              type="button"
              variant="outline"
            >
              {t("resetPasswordDialog.cancel")}
            </Button>
            <Button isPending={setPassword.isPending} type="submit">
              {t("resetPasswordDialog.confirm")}
            </Button>
          </DialogFooter>
        </FieldGroup>
      </form>
    </Dialog>
  )
}
