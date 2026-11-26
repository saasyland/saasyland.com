import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"
import { signUpWithPasswordSchema } from "~/src/integrations/better-auth/auth.zod"
import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { showFieldError, submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { signUpWithPasswordMutation } from "~/src/modules/account/use-cases/sign-up-with-password"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { EmailSuggestion } from "~/src/presentation/components/custom/auth/email-suggestion"
import { PasswordInput } from "~/src/presentation/components/custom/auth/password-input"
import { PasswordRequirements } from "~/src/presentation/components/custom/auth/password-requirements"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import { ROUTES } from "~/src/routes"

const EMAIL_SUGGESTION_ID = "sign-up-email-suggestion"

const TEXT_FIELDS = [
  { describedBy: "sign-up-name-error", name: "name", type: "text" },
  { describedBy: `sign-up-email-error ${EMAIL_SUGGESTION_ID}`, name: "email", type: "email" },
] as const

const useSignUp = () => {
  const t = useTranslations("pages.auth.sign-up.form")
  const router = useRouter()
  const queryClient = useQueryClient()

  const { finishSignIn, redirect } = useAuthRedirect()

  return useMutation({
    ...signUpWithPasswordMutation,
    onSuccess: async ({ signedIn }, { email }) => {
      if (signedIn) {
        await finishSignIn()
        toast.success(t("created", { email }))
        return
      }
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL })
      await router.navigate({ search: { email, redirect }, to: ROUTES.AUTH.VERIFY_EMAIL })
      toast.success(t("successCheckEmail"))
    },
  })
}

export const SignUpForm = (): JSX.Element => {
  const t = useTranslations()
  const errorMessage = useErrorMessage()
  const signUp = useSignUp()

  const { hrefWithRedirect } = useAuthRedirect()

  const form = useForm({
    defaultValues: { email: "", name: "", password: "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ formApi, value }) => {
      signUp.mutate(
        { ...value, callbackURL: hrefWithRedirect(ROUTES.AUTH.CALLBACK) },
        {
          onError: (error) => {
            if (error.message === AUTH_ERRORS.PASSWORD_COMPROMISED) {
              showFieldError(formApi, { controlId: "sign-up-password", field: "password", message: error.message })
              return
            }
            toast.error(errorMessage(error))
          },
        },
      )
    },
    validators: { onChange: signUpWithPasswordSchema },
  })

  return (
    <form
      className="flex flex-col gap-6"
      id="sign-up-form"
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <FieldGroup>
        {TEXT_FIELDS.map(({ describedBy, name, type }) => (
          <form.Field key={name} name={name}>
            {(field) => {
              const isInvalid = isFieldInvalid(field)

              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel className="text-body-sm text-foreground" htmlFor={`sign-up-${name}`}>
                    {t(`pages.auth.sign-up.form.${name}`)}
                  </FieldLabel>
                  <Input
                    aria-describedby={describedBy}
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
                    type={type}
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
                  {name === "email" && (
                    <EmailSuggestion
                      email={field.state.value}
                      id={EMAIL_SUGGESTION_ID}
                      isShown={field.state.meta.isBlurred}
                      onAccept={(email) => {
                        field.handleChange(email)
                      }}
                    />
                  )}
                </Field>
              )
            }}
          </form.Field>
        ))}
        <form.Field name="password">
          {(field) => {
            const isInvalid = isFieldInvalid(field)

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel className="text-body-sm text-foreground" htmlFor="sign-up-password">
                  {t("pages.auth.sign-up.form.password")}
                </FieldLabel>
                <PasswordInput
                  aria-describedby="sign-up-password-error sign-up-password-requirements"
                  aria-invalid={isInvalid}
                  autoComplete="new-password"
                  id="sign-up-password"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                  value={field.state.value}
                />
                {isInvalid && (
                  <ValidationFieldError
                    id="sign-up-password-error"
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

      <form.Subscribe selector={(state) => state.values.password}>
        {(password) => <PasswordRequirements id="sign-up-password-requirements" password={password} />}
      </form.Subscribe>

      <Button
        aria-label={t("pages.auth.sign-up.form.submit")}
        className="h-11 w-full gap-2 px-5 text-body-sm font-semibold transition-[background-color,color,transform]"
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
