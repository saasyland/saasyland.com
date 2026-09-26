import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { signUpWithPasswordSchema } from "~/src/integrations/better-auth/auth.zod"
import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { signUpWithPasswordMutation } from "~/src/modules/account/use-cases/sign-up-with-password"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { triggerConfetti } from "~/src/lib/confetti"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { PasswordInput } from "~/src/presentation/components/custom/auth/password-input"
import { PasswordRequirements } from "~/src/presentation/components/custom/auth/password-requirements"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import { ROUTES } from "~/src/routes"

export const SignUpForm = (): JSX.Element => {
  const t = useTranslations()
  const router = useRouter()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const signUp = useMutation({
    ...signUpWithPasswordMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async (_, { email }) => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL })
      await router.navigate({ search: { email }, to: ROUTES.VERIFY_EMAIL })
      triggerConfetti()
      toast.success(t("pages.auth.sign-up.form.successCheckEmail"))
    },
  })

  const form = useForm({
    defaultValues: { confirmPassword: "", email: "", name: "", password: "" },
    onSubmit: ({ value }) => {
      signUp.mutate({ ...value, callbackURL: localizePathname({ locale: getCurrentLocale(), pathname: ROUTES.APP }) })
    },
    validators: { onChange: signUpWithPasswordSchema, onSubmit: signUpWithPasswordSchema },
  })

  return (
    <form
      className="flex flex-col gap-6"
      id="sign-up-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup>
        {(["name", "email"] as const).map((name) => (
          <form.Field key={name} name={name}>
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="text-body-sm text-foreground" htmlFor={`sign-up-${name}`}>
                    {t(`pages.auth.sign-up.form.${name}`)}
                  </FieldLabel>
                  <Input
                    aria-describedby={isInvalid ? `sign-up-${name}-error` : undefined}
                    aria-invalid={isInvalid}
                    autoComplete={name}
                    className="h-11 px-3 text-foreground transition-[border-color,box-shadow] duration-200 ease-exp"
                    id={`sign-up-${name}`}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                    }}
                    placeholder={t(`auth.form.placeholders.${name}`)}
                    type={name === "email" ? "email" : "text"}
                    value={field.state.value}
                  />
                  {isInvalid && (
                    <ValidationFieldError
                      id={`sign-up-${name}-error`}
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
        {(["password", "confirmPassword"] as const).map((name) => (
          <form.Field key={name} name={name}>
            {(field) => {
              const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="text-body-sm text-foreground" htmlFor={`sign-up-${name}`}>
                    {t(`pages.auth.sign-up.form.${name}`)}
                  </FieldLabel>
                  <PasswordInput
                    aria-describedby={isInvalid ? `sign-up-${name}-error` : undefined}
                    aria-invalid={isInvalid}
                    autoComplete="new-password"
                    id={`sign-up-${name}`}
                    name={field.name}
                    onBlur={field.handleBlur}
                    onChange={(event) => {
                      field.handleChange(event.target.value)
                    }}
                    value={field.state.value}
                  />
                  {isInvalid && (
                    <ValidationFieldError
                      id={`sign-up-${name}-error`}
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
        aria-label={t("pages.auth.sign-up.form.submit")}
        className="h-12 w-full gap-2 text-body-sm font-semibold transition-[background-color,color,transform]"
        id="sign-up-form-submit-button"
        isPending={signUp.isPending}
        type="submit"
      >
        {signUp.isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
        {t(signUp.isPending ? "pages.auth.sign-up.form.submitting" : "pages.auth.sign-up.form.submit")}
      </Button>
    </form>
  )
}
