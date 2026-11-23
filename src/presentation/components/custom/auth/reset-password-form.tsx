import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"
import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { showFieldError, submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { resetPasswordMutation } from "~/src/modules/verification/use-cases/reset-password"
import { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldLabel } from "~/src/presentation/components/shadcn/field"

import { PasswordInput } from "~/src/presentation/components/custom/auth/password-input"
import { PasswordRequirements } from "~/src/presentation/components/custom/auth/password-requirements"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import * as ROUTES from "~/src/routes"

export const ResetPasswordForm = ({ token }: { readonly token: string }): JSX.Element => {
  const t = useTranslations("pages.auth.reset-password.form")
  const router = useRouter()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const { redirect } = useAuthRedirect()

  const resetPassword = useMutation({
    ...resetPasswordMutation,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL })
      toast.success(t("success"))
      await router.navigate({ search: { redirect }, to: ROUTES.SIGN_IN })
    },
  })

  const form = useForm({
    defaultValues: { password: "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ formApi, value }) => {
      resetPassword.mutate(
        { ...value, token },
        {
          onError: (error) => {
            if (error.message === AUTH_ERRORS.PASSWORD_COMPROMISED) {
              showFieldError(formApi, { controlId: "reset-password-password", field: "password", message: error.message })
              return
            }
            toast.error(errorMessage(error))
          },
        },
      )
    },
    validators: { onChange: verificationZodSchemas.resetPasswordForm },
  })

  return (
    <form
      className="flex flex-col gap-6"
      id="reset-password-form"
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <form.Field name="password">
        {(field) => {
          const isInvalid = isFieldInvalid(field)

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel className="text-body-sm text-foreground" htmlFor="reset-password-password">
                {t("password")}
              </FieldLabel>
              <PasswordInput
                aria-describedby="reset-password-password-error reset-password-requirements"
                aria-invalid={isInvalid}
                autoComplete="new-password"
                id="reset-password-password"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value)
                }}
                value={field.state.value}
              />
              {isInvalid && (
                <ValidationFieldError
                  id="reset-password-password-error"
                  message={fieldErrorMessage(field.state.meta.errors)}
                  namespace="auth.validations"
                  params={AUTH_VALIDATION_PARAMS}
                />
              )}
            </Field>
          )
        }}
      </form.Field>

      <form.Subscribe selector={(state) => state.values.password}>
        {(password) => <PasswordRequirements id="reset-password-requirements" password={password} />}
      </form.Subscribe>

      <Button
        aria-label={t("submit")}
        className="h-11 w-full gap-2 px-5 text-body-sm font-semibold transition-[background-color,color,transform]"
        data-testid="reset-password-form-submit-button"
        isPending={resetPassword.isPending}
        type="submit"
      >
        {resetPassword.isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
        {t(resetPassword.isPending ? "submitting" : "submit")}
      </Button>
    </form>
  )
}
