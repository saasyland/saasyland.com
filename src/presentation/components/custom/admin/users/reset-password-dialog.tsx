import { type JSX, useId } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"

import { setUserPasswordMutation } from "~/src/modules/user/use-cases/set-user-password"
import { USER_QUERY_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "~/src/presentation/components/shadcn/dialog"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

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
    validators: { onChange: userZodSchemas.setUserPasswordForm, onSubmit: userZodSchemas.setUserPasswordForm },
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
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <FieldGroup>
          <form.Field name="newPassword">
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor={passwordId}>{t("resetPasswordDialog.password")}</FieldLabel>
                  <Input
                    aria-invalid={isInvalid}
                    autoComplete="new-password"
                    id={passwordId}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                    }}
                    type="password"
                    value={field.state.value}
                  />
                  {isInvalid && (
                    <ValidationFieldError
                      message={fieldErrorMessage(field.state.meta.errors)}
                      namespace="auth.validations"
                      params={AUTH_VALIDATION_PARAMS}
                    />
                  )}
                </Field>
              )
            }}
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
