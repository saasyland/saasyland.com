import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"

import { accountZodSchemas } from "~/src/modules/account/account.zod"
import { changePasswordMutation } from "~/src/modules/account/use-cases/change-password"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { PasswordRequirements } from "~/src/presentation/components/custom/auth/password-requirements"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const PASSWORD_FIELDS = [
  { autoComplete: "current-password", labelKey: "current", name: "currentPassword" },
  { autoComplete: "new-password", labelKey: "new", name: "newPassword" },
  { autoComplete: "new-password", labelKey: "confirm", name: "confirmNewPassword" },
] as const

const changePasswordSchema = accountZodSchemas.changePasswordForm

export const SettingsPasswordForm = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.password")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const changePassword = useMutation({
    ...changePasswordMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL }),
  })

  const form = useForm({
    defaultValues: { confirmNewPassword: "", currentPassword: "", newPassword: "" },
    onSubmit: ({ formApi, value }) => {
      changePassword.mutate(
        { currentPassword: value.currentPassword, newPassword: value.newPassword },
        {
          onSuccess: () => {
            toast.success(t("feedback.updateSuccess"))
            formApi.reset()
          },
        },
      )
    },
    validators: { onChange: changePasswordSchema, onSubmit: changePasswordSchema },
  })

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border p-5">
        <CardTitle className="mb-1 text-base font-medium text-foreground">{t("title")}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{t("description")}</CardDescription>
      </CardHeader>

      <form
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          void form.handleSubmit()
        }}
      >
        <CardContent className="grid grid-cols-1 items-start gap-8 p-5 lg:grid-cols-[1.5fr_1fr] lg:gap-12">
          <FieldGroup className="gap-4">
            {PASSWORD_FIELDS.map(({ autoComplete, labelKey, name }) => (
              <form.Field key={name} name={name}>
                {(field) => {
                  const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel className="text-xs" htmlFor={field.name}>
                        {t(labelKey)}
                      </FieldLabel>
                      <Input
                        aria-invalid={isInvalid}
                        autoComplete={autoComplete}
                        id={field.name}
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
            ))}
          </FieldGroup>
          <div className="rounded-lg border border-border bg-muted/40 p-5">
            <h3 className="mb-4 text-xs font-medium text-foreground">{t("requirements.title")}</h3>
            <form.Subscribe selector={(state) => state.values}>
              {({ confirmNewPassword, newPassword }) => (
                <PasswordRequirements confirmPassword={confirmNewPassword} password={newPassword} />
              )}
            </form.Subscribe>
          </div>
        </CardContent>
        <div className="flex justify-end border-t border-border bg-muted/40 p-4">
          <Button className="h-8 px-4 text-xs shadow-sm" isPending={changePassword.isPending} size="sm" type="submit">
            {t("update")}
          </Button>
        </div>
      </form>
    </Card>
  )
}
