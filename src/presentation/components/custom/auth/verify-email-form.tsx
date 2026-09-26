import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation } from "@tanstack/react-query"
import { Link, getRouteApi } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { sendVerificationEmailMutation } from "~/src/modules/verification/use-cases/send-verification-email"
import { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { cn } from "~/src/lib/cn"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"
import { Field, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import { ROUTES } from "~/src/routes"

const routeApi = getRouteApi("/auth/verify-email")

const emailSchema = verificationZodSchemas.sendVerificationEmail.pick({ email: true })

export const VerifyEmailForm = (): JSX.Element => {
  const t = useTranslations("pages.auth.verify-email")
  const errorMessage = useErrorMessage()
  const signUpEmail = routeApi.useSearch({ select: (search) => search.email.trim() })

  const resend = useMutation({
    ...sendVerificationEmailMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: () => {
      toast.success(t("form.resendSuccess"))
    },
  })

  const form = useForm({
    defaultValues: { email: signUpEmail },
    onSubmit: ({ value }) => {
      if (resend.isPending) {
        return
      }
      resend.mutate({ callbackURL: localizePathname({ locale: getCurrentLocale(), pathname: ROUTES.AUTH_CALLBACK }), email: value.email })
    },
    validators: { onChange: emailSchema, onSubmit: emailSchema },
  })

  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <Link
        className={cn(buttonVariants(), "h-12 w-full gap-2 text-body-sm font-semibold transition-[background-color,color,transform]")}
        to={ROUTES.SIGN_IN}
      >
        {t("form.backToSignIn")}
      </Link>

      <form.Field name="email">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

          if (signUpEmail !== "" && !isInvalid) {
            return
          }

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel className="text-body-sm text-foreground" htmlFor="verify-email-email">
                {t("form.email")}
              </FieldLabel>
              <Input
                aria-describedby={isInvalid ? "verify-email-email-error" : undefined}
                aria-invalid={isInvalid}
                autoComplete="email"
                className="h-11 px-3 text-foreground transition-[border-color,box-shadow] duration-200 ease-exp"
                disabled={resend.isPending}
                id="verify-email-email"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value)
                }}
                placeholder={t("form.emailPlaceholder")}
                type="email"
                value={field.state.value}
              />
              {isInvalid && (
                <ValidationFieldError
                  id="verify-email-email-error"
                  message={fieldErrorMessage(field.state.meta.errors)}
                  namespace="auth.validations"
                  params={AUTH_VALIDATION_PARAMS}
                />
              )}
            </Field>
          )
        }}
      </form.Field>

      <Button
        className="min-h-11 self-center px-0 text-body-sm text-muted-foreground"
        data-testid="verify-email-resend-button"
        isPending={resend.isPending}
        type="submit"
        variant="link"
      >
        {resend.isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
        {t(resend.isPending ? "form.resending" : "form.resend")}
      </Button>
    </form>
  )
}
