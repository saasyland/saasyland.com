import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { requestPasswordResetMutation } from "~/src/modules/verification/use-cases/request-password-reset"
import { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import { ROUTES } from "~/src/routes"

export const ForgotPasswordForm = (): JSX.Element => {
  const t = useTranslations()
  const errorMessage = useErrorMessage()

  const requestPasswordReset = useMutation({
    ...requestPasswordResetMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: () => {
      toast.success(t("pages.auth.forgot-password.form.success"))
    },
  })

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: ({ value }) => {
      requestPasswordReset.mutate({
        email: value.email,
        redirectTo: localizePathname({ locale: getCurrentLocale(), pathname: ROUTES.RESET_PASSWORD }),
      })
    },
    validators: { onChange: verificationZodSchemas.forgotPassword, onSubmit: verificationZodSchemas.forgotPassword },
  })

  return (
    <form
      className="flex flex-col gap-6"
      id="forgot-password-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        <form.Field name="email">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel className="text-body-sm text-foreground" htmlFor="forgot-password-email">
                  {t("pages.auth.forgot-password.form.email")}
                </FieldLabel>
                <Input
                  aria-describedby={isInvalid ? "forgot-password-email-error" : undefined}
                  aria-invalid={isInvalid}
                  autoComplete="email"
                  className="h-11 px-3 text-foreground transition-[border-color,box-shadow] duration-200 ease-exp"
                  disabled={requestPasswordReset.isSuccess}
                  id="forgot-password-email"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                  placeholder={t("auth.form.placeholders.email")}
                  type="email"
                  value={field.state.value}
                />
                {isInvalid && (
                  <ValidationFieldError
                    id="forgot-password-email-error"
                    message={fieldErrorMessage(field.state.meta.errors)}
                    namespace="auth.validations"
                    params={AUTH_VALIDATION_PARAMS}
                  />
                )}
              </Field>
            )
          }}
        </form.Field>
      </FieldGroup>

      <Button
        aria-label={t("pages.auth.forgot-password.form.submit")}
        className="h-12 w-full gap-2 text-body-sm font-semibold transition-[background-color,color,transform]"
        data-testid="forgot-password-form-submit-button"
        isDisabled={requestPasswordReset.isSuccess}
        isPending={requestPasswordReset.isPending}
        type="submit"
      >
        {requestPasswordReset.isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
        {t(requestPasswordReset.isPending ? "pages.auth.forgot-password.form.submitting" : "pages.auth.forgot-password.form.submit")}
      </Button>
    </form>
  )
}
