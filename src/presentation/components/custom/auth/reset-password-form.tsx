import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { getRouteApi, useRouter } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { resetPasswordMutation } from "~/src/modules/verification/use-cases/reset-password"
import { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"

import { PasswordInput } from "~/src/presentation/components/custom/auth/password-input"
import { PasswordRequirements } from "~/src/presentation/components/custom/auth/password-requirements"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import { ROUTES } from "~/src/routes"

const routeApi = getRouteApi("/auth/reset-password")

export const ResetPasswordForm = (): JSX.Element => {
  const t = useTranslations("pages.auth.reset-password.form")
  const router = useRouter()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()
  const { token } = routeApi.useSearch()

  const resetPassword = useMutation({
    ...resetPasswordMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL })
      toast.success(t("success"))
      await router.navigate({ to: ROUTES.SIGN_IN })
    },
  })

  const form = useForm({
    defaultValues: { confirmPassword: "", password: "" },
    onSubmit: ({ value }) => {
      resetPassword.mutate({ ...value, token })
    },
    validators: { onChange: verificationZodSchemas.resetPasswordForm, onSubmit: verificationZodSchemas.resetPasswordForm },
  })

  return (
    <form
      className="flex flex-col gap-6"
      id="reset-password-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        {(["password", "confirmPassword"] as const).map((name) => (
          <form.Field key={name} name={name}>
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="text-body-sm text-foreground" htmlFor={`reset-password-${name}`}>
                    {t(name)}
                  </FieldLabel>
                  <PasswordInput
                    aria-describedby={isInvalid ? `reset-password-${name}-error` : undefined}
                    aria-invalid={isInvalid}
                    autoComplete="new-password"
                    id={`reset-password-${name}`}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                    }}
                    value={field.state.value}
                  />
                  {isInvalid && (
                    <ValidationFieldError
                      id={`reset-password-${name}-error`}
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

      <form.Subscribe selector={(state) => state.values}>
        {({ confirmPassword, password }) => <PasswordRequirements confirmPassword={confirmPassword} password={password} />}
      </form.Subscribe>

      <Button
        aria-label={t("submit")}
        className="h-12 w-full gap-2 text-body-sm font-semibold transition-[background-color,color,transform]"
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
