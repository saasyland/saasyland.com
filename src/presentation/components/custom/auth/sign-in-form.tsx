import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation } from "@tanstack/react-query"
import { Link, useRouter } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { signIn } from "~/src/integrations/better-auth/auth.client"
import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { AUTH_ERRORS, authErrorKey } from "~/src/integrations/better-auth/auth.errors"
import { signInWithPasswordSchema } from "~/src/integrations/better-auth/auth.zod"
import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"

import { usePostAuthRedirect } from "~/src/hooks/use-post-auth-redirect"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { PasswordInput } from "~/src/presentation/components/custom/auth/password-input"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import { ROUTES } from "~/src/routes"

const signInEmail = createClientOnlyFn((data: Parameters<typeof signIn.email>[0]) => signIn.email(data))

export const SignInForm = (): JSX.Element => {
  const t = useTranslations()
  const router = useRouter()
  const redirectAfterAuth = usePostAuthRedirect()

  const signInRequest = useMutation({
    mutationFn: signInEmail,
    onError: () => {
      toast.error(t("errors.codes.INTERNAL_ERROR"))
    },
    onSuccess: async ({ data, error }, { email }) => {
      if (error) {
        const errorKey = authErrorKey(error)
        toast.error(t(`auth.errors.${errorKey}`))
        if (errorKey === AUTH_ERRORS.EMAIL_NOT_VERIFIED) {
          await router.navigate({ search: { email }, to: ROUTES.VERIFY_EMAIL })
        }
        return
      }
      if ("twoFactorRedirect" in data && data.twoFactorRedirect === true) {
        return
      }
      toast.success(t("pages.auth.sign-in.form.success"))
      await redirectAfterAuth()
    },
  })

  const form = useForm({
    defaultValues: { email: "", password: "" },
    onSubmit: ({ value }) => {
      signInRequest.mutate(value)
    },
    validators: { onChange: signInWithPasswordSchema, onSubmit: signInWithPasswordSchema },
  })

  return (
    <form
      className="flex flex-col gap-6"
      id="sign-in-form"
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
                <FieldLabel className="text-body-sm text-foreground" htmlFor="sign-in-email">
                  {t("pages.auth.sign-in.form.email")}
                </FieldLabel>
                <Input
                  aria-describedby={isInvalid ? "sign-in-email-error" : undefined}
                  aria-invalid={isInvalid}
                  autoComplete="email"
                  className="h-11 px-3 text-foreground transition-[border-color,box-shadow] duration-200 ease-exp"
                  id="sign-in-email"
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
                    id="sign-in-email-error"
                    message={fieldErrorMessage(field.state.meta.errors)}
                    namespace="auth.validations"
                    params={AUTH_VALIDATION_PARAMS}
                  />
                )}
              </Field>
            )
          }}
        </form.Field>
        <form.Field name="password">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel
                  className="flex w-full items-center justify-between gap-4 text-body-sm text-foreground"
                  htmlFor="sign-in-password"
                >
                  <span>{t("pages.auth.sign-in.form.password")}</span>
                  <Link
                    className="-my-3 inline-flex h-11 items-center font-normal text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground"
                    to={ROUTES.FORGOT_PASSWORD}
                  >
                    {t("pages.auth.sign-in.form.forgotPassword")}
                  </Link>
                </FieldLabel>
                <PasswordInput
                  aria-describedby={isInvalid ? "sign-in-password-error" : undefined}
                  aria-invalid={isInvalid}
                  autoComplete="current-password"
                  id="sign-in-password"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                  value={field.state.value}
                />
                {isInvalid && (
                  <ValidationFieldError
                    id="sign-in-password-error"
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
        aria-label={t("pages.auth.sign-in.form.submit")}
        className="h-12 w-full gap-2 text-body-sm font-semibold transition-[background-color,color,transform]"
        data-testid="sign-in-form-submit-button"
        isPending={signInRequest.isPending}
        type="submit"
      >
        {signInRequest.isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
        {t(signInRequest.isPending ? "pages.auth.sign-in.form.submitting" : "pages.auth.sign-in.form.submit")}
      </Button>
    </form>
  )
}
