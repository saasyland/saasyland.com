import { type JSX, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { Loader2, MailCheck } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { EMAIL_LINK_LIFETIME_HOURS } from "~/src/integrations/better-auth/auth.constants"
import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { requestPasswordResetMutation } from "~/src/modules/verification/use-cases/request-password-reset"
import { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useEmailLinkResend } from "~/src/hooks/use-email-link-resend"
import { usePrefilledEmail } from "~/src/hooks/use-prefilled-email"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { ADDRESS_TAGS } from "~/src/presentation/components/custom/address-tags"
import { ResendLinkButton, ResendLinkStatus } from "~/src/presentation/components/custom/auth/email-link-resend"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import * as ROUTES from "~/src/routes"

export const ForgotPasswordForm = (): JSX.Element => {
  const t = useTranslations("pages.auth.forgot-password")
  const prefilledEmail = usePrefilledEmail()
  const [requestedFor, setRequestedFor] = useState<string>()

  const { hrefWithRedirect } = useAuthRedirect()
  const resetLink = useEmailLinkResend(requestPasswordResetMutation)

  const request = (email: string) => {
    setRequestedFor(email)
    resetLink.send({ email, redirectTo: hrefWithRedirect(ROUTES.RESET_PASSWORD) })
  }

  const form = useForm({
    defaultValues: { email: prefilledEmail },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      request(value.email)
    },
    validators: { onChange: verificationZodSchemas.forgotPassword },
  })

  if (requestedFor !== undefined && resetLink.outcome !== undefined) {
    return (
      <form
        className="flex flex-col gap-4"
        noValidate
        onSubmit={(event) => {
          event.preventDefault()
          request(requestedFor)
        }}
      >
        <div className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3">
          <MailCheck aria-hidden className="mt-0.5 size-4 shrink-0 text-ring" strokeWidth={2} />
          <p className="text-body-sm text-pretty text-muted-foreground">
            {t.rich("sent.description", { ...ADDRESS_TAGS, email: requestedFor, hours: EMAIL_LINK_LIFETIME_HOURS })}
          </p>
        </div>
        <ResendLinkButton className="w-full" cooldownSeconds={resetLink.cooldownSeconds} isPending={resetLink.isPending} variant="outline">
          {t("sent.resend")}
        </ResendLinkButton>
        <ResendLinkStatus accountKnown={false} outcome={resetLink.outcome} />
        <Button
          className="h-11 px-5 text-body-sm"
          onPress={() => {
            form.setFieldValue("email", "", { dontUpdateMeta: true, dontValidate: true })
            setRequestedFor(undefined)
          }}
          variant="ghost"
        >
          {t("sent.useDifferentEmail")}
        </Button>
      </form>
    )
  }

  return (
    <form
      className="flex flex-col gap-6"
      id="forgot-password-form"
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
                <FieldLabel className="text-body-sm text-foreground" htmlFor="forgot-password-email">
                  {t("form.email")}
                </FieldLabel>
                <Input
                  aria-describedby="forgot-password-email-error"
                  aria-invalid={isInvalid}
                  autoComplete="email"
                  className="h-11 px-3 text-foreground transition-[border-color,box-shadow] duration-200 ease-exp"
                  id="forgot-password-email"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
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
        aria-label={t("form.submit")}
        className="h-11 w-full gap-2 px-5 text-body-sm font-semibold transition-[background-color,color,transform]"
        data-testid="forgot-password-form-submit-button"
        isPending={resetLink.isPending}
        type="submit"
      >
        {resetLink.isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
        {t(resetLink.isPending ? "form.submitting" : "form.submit")}
      </Button>
    </form>
  )
}
