import { type JSX, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation } from "@tanstack/react-query"
import { Link, useRouter } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"
import { CircleAlert, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { signIn } from "~/src/integrations/better-auth/auth.client"
import { LOGIN_METHOD } from "~/src/integrations/better-auth/auth.constants"
import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { AUTH_ERRORS, type AuthErrorMessageKey, authErrorKey } from "~/src/integrations/better-auth/auth.errors"
import { signInWithPasswordSchema } from "~/src/integrations/better-auth/auth.zod"
import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useLastLoginMethod } from "~/src/hooks/use-last-login-method"
import { usePrefilledEmail } from "~/src/hooks/use-prefilled-email"

import { Alert, AlertDescription, AlertTitle } from "~/src/presentation/components/shadcn/alert"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { LastUsedBadge, OAuthLinks } from "~/src/presentation/components/custom/auth/oauth-buttons"
import { PasswordInput } from "~/src/presentation/components/custom/auth/password-input"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import { ROUTES } from "~/src/routes"

const RECOVERY_LINK_CLASS = "inline-flex min-h-10 items-center font-medium text-foreground underline underline-offset-4"

const signInEmail = createClientOnlyFn((data: Parameters<typeof signIn.email>[0]) => signIn.email(data))

interface SignInFailureProps {
  readonly email: string
  readonly reason: AuthErrorMessageKey
}

const emailSearch = (email: string): string | undefined => (email === "" ? undefined : email)

const ForgotPasswordLink = ({ email }: { readonly email: string }): JSX.Element => {
  const t = useTranslations("pages.auth.sign-in.form")

  const { redirect } = useAuthRedirect()

  return (
    <Link
      className="-my-3 inline-flex h-11 items-center text-body-sm text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground"
      search={{ email: emailSearch(email), redirect }}
      to={ROUTES.FORGOT_PASSWORD}
    >
      {t("forgotPassword")}
    </Link>
  )
}

const SignInFailure = ({ email, reason }: SignInFailureProps): JSX.Element => {
  const t = useTranslations()

  const { redirect } = useAuthRedirect()

  return (
    <Alert className="gap-1 px-4 py-3" variant="destructive">
      <CircleAlert aria-hidden />
      <AlertTitle className="text-body-sm">{t(`auth.errors.${reason}`)}</AlertTitle>
      {reason === AUTH_ERRORS.INVALID_EMAIL_OR_PASSWORD && (
        <AlertDescription>
          <ul className="mt-1 flex flex-col items-start text-body-sm">
            <li>
              <Link className={RECOVERY_LINK_CLASS} search={{ email: emailSearch(email), redirect }} to={ROUTES.FORGOT_PASSWORD}>
                {t("pages.auth.sign-in.form.resetPassword")}
              </Link>
            </li>
            <OAuthLinks />
          </ul>
        </AlertDescription>
      )}
    </Alert>
  )
}

export const SignInForm = (): JSX.Element => {
  const t = useTranslations()
  const router = useRouter()
  const { isLastUsed } = useLastLoginMethod()
  const prefilledEmail = usePrefilledEmail()
  const [failure, setFailure] = useState<SignInFailureProps>()

  const { finishSignIn, redirect } = useAuthRedirect()

  const signInRequest = useMutation({
    mutationFn: signInEmail,
    onError: (_, { email }) => {
      setFailure({ email, reason: AUTH_ERRORS.UNKNOWN_ERROR })
    },
    onMutate: () => {
      setFailure(undefined)
    },
    onSuccess: async ({ data, error }, { email }) => {
      if (error) {
        const reason = authErrorKey(error)
        if (reason === AUTH_ERRORS.EMAIL_NOT_VERIFIED) {
          await router.navigate({ search: { email, redirect, unverified: true }, to: ROUTES.VERIFY_EMAIL })
          return
        }
        setFailure({ email, reason })
        return
      }
      if ("twoFactorRedirect" in data && data.twoFactorRedirect === true) {
        await router.navigate({ search: { redirect }, to: ROUTES.TWO_FACTOR })
        return
      }
      toast.success(t("pages.auth.sign-in.form.success"))
      await finishSignIn()
    },
  })

  const form = useForm({
    defaultValues: { email: prefilledEmail, password: "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      signInRequest.mutate(value)
    },
    validators: { onChange: signInWithPasswordSchema },
  })

  return (
    <form
      className="flex flex-col gap-6"
      id="sign-in-form"
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <FieldGroup>
        <form.Field name="email">
          {(field) => {
            const isInvalid = isFieldInvalid(field)

            return (
              <Field data-invalid={isInvalid}>
                <div className="flex items-center justify-between gap-4">
                  <FieldLabel className="text-body-sm text-foreground" htmlFor="sign-in-email">
                    {t("pages.auth.sign-in.form.email")}
                  </FieldLabel>
                  {isLastUsed(LOGIN_METHOD.EMAIL) && <LastUsedBadge />}
                </div>
                <Input
                  aria-describedby="sign-in-email-error"
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
            const isInvalid = isFieldInvalid(field)

            return (
              <Field data-invalid={isInvalid}>
                <div className="flex items-center justify-between gap-4">
                  <FieldLabel className="text-body-sm text-foreground" htmlFor="sign-in-password">
                    {t("pages.auth.sign-in.form.password")}
                  </FieldLabel>
                  <form.Subscribe selector={(state) => state.values.email}>
                    {(email) => <ForgotPasswordLink email={email} />}
                  </form.Subscribe>
                </div>
                <PasswordInput
                  aria-describedby="sign-in-password-error"
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

      {failure !== undefined && <SignInFailure email={failure.email} reason={failure.reason} />}

      <Button
        aria-label={t("pages.auth.sign-in.form.submit")}
        className="h-11 w-full gap-2 px-5 text-body-sm font-semibold transition-[background-color,color,transform]"
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
