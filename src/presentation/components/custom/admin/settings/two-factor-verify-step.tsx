import { type JSX, useId } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS, TWO_FACTOR_CODE_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { createOtpSlotIndices, extractTotpSecret } from "~/src/modules/two-factor/two-factor.utils"
import { twoFactorZodSchemas } from "~/src/modules/two-factor/two-factor.zod"
import { verifyTotpMutation } from "~/src/modules/two-factor/use-cases/verify-totp"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/src/presentation/components/shadcn/input-otp"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const codeSchema = twoFactorZodSchemas.verifyTotp.pick({ code: true })

export const TwoFactorVerifyStep = ({
  onVerified,
  totpUri,
}: {
  readonly onVerified: () => void
  readonly totpUri: string
}): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.twoFactor")
  const codeId = useId()

  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const verifyTotp = useMutation({
    ...verifyTotpMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL })
      toast.success(t("enabledSuccess"))
    },
  })

  const form = useForm({
    defaultValues: { code: "" },
    onSubmit: ({ value }) => {
      verifyTotp.mutate(value, { onSuccess: onVerified })
    },
    validators: { onChange: codeSchema, onSubmit: codeSchema },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <FieldGroup className="gap-4">
        <p className="text-sm text-muted-foreground">{t("scanInstructions")}</p>
        <code className="block overflow-x-auto rounded-md bg-muted/60 p-3 text-xs text-foreground">{extractTotpSecret(totpUri)}</code>

        <form.Field name="code">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={codeId}>{t("verificationCode")}</FieldLabel>
                <InputOTP
                  aria-invalid={isInvalid}
                  id={codeId}
                  maxLength={TWO_FACTOR_CODE_LENGTH}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={field.handleChange}
                  value={field.state.value}
                >
                  <InputOTPGroup>
                    {createOtpSlotIndices(TWO_FACTOR_CODE_LENGTH).map((index) => (
                      <InputOTPSlot index={index} key={index} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
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

        <Button isPending={verifyTotp.isPending} type="submit">
          {t("verifyAndEnable")}
        </Button>
      </FieldGroup>
    </form>
  )
}
