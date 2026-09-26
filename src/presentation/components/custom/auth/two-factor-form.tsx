import { type JSX, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS, TWO_FACTOR_CODE_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"

import { createOtpSlotIndices } from "~/src/modules/two-factor/two-factor.utils"
import { twoFactorZodSchemas } from "~/src/modules/two-factor/two-factor.zod"
import { verifyBackupCodeMutation } from "~/src/modules/two-factor/use-cases/verify-backup-code"
import { verifyTotpMutation } from "~/src/modules/two-factor/use-cases/verify-totp"

import { useErrorMessage } from "~/src/hooks/use-error-message"
import { usePostAuthRedirect } from "~/src/hooks/use-post-auth-redirect"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "~/src/presentation/components/shadcn/input-otp"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const SUBMIT_CLASS = "h-12 w-full gap-2 text-body-sm font-semibold transition-[background-color,color,transform]"

const totpSchema = twoFactorZodSchemas.verifyTotp.required({ trustDevice: true })
const backupCodeSchema = twoFactorZodSchemas.verifyBackupCode.required({ trustDevice: true })

const TotpForm = (): JSX.Element => {
  const t = useTranslations("pages.auth.two-factor.form")
  const errorMessage = useErrorMessage()
  const redirectAfterAuth = usePostAuthRedirect()

  const verifyTotp = useMutation({
    ...verifyTotpMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      toast.success(t("success"))
      await redirectAfterAuth()
    },
  })

  const form = useForm({
    defaultValues: { code: "", trustDevice: true },
    onSubmit: ({ value }) => {
      verifyTotp.mutate(value)
    },
    validators: { onChange: totpSchema, onSubmit: totpSchema },
  })

  return (
    <form
      className="flex flex-col gap-6"
      id="two-factor-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="code">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel className="text-body-sm text-foreground" htmlFor="two-factor-code">
                {t("code")}
              </FieldLabel>
              <InputOTP
                aria-describedby={isInvalid ? "two-factor-code-error" : undefined}
                aria-invalid={isInvalid}
                id="two-factor-code"
                maxLength={TWO_FACTOR_CODE_LENGTH}
                name={field.name}
                onBlur={field.handleBlur}
                onChange={field.handleChange}
                value={field.state.value}
              >
                <InputOTPGroup>
                  {createOtpSlotIndices(TWO_FACTOR_CODE_LENGTH).map((index) => (
                    <InputOTPSlot
                      className="size-12 border-input font-mono text-lead tabular-nums transition-[border-color,box-shadow] duration-200 ease-exp data-[active=true]:border-ring data-[active=true]:ring-3 data-[active=true]:ring-ring/50"
                      index={index}
                      key={index}
                    />
                  ))}
                </InputOTPGroup>
              </InputOTP>
              {isInvalid && (
                <ValidationFieldError
                  id="two-factor-code-error"
                  message={fieldErrorMessage(field.state.meta.errors)}
                  namespace="auth.validations"
                  params={AUTH_VALIDATION_PARAMS}
                />
              )}
            </Field>
          )
        }}
      </form.Field>

      <Button className={SUBMIT_CLASS} data-testid="two-factor-form-submit-button" isPending={verifyTotp.isPending} type="submit">
        {verifyTotp.isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
        {t(verifyTotp.isPending ? "submitting" : "submit")}
      </Button>
    </form>
  )
}

const BackupCodeForm = (): JSX.Element => {
  const t = useTranslations("pages.auth.two-factor.form")
  const errorMessage = useErrorMessage()
  const redirectAfterAuth = usePostAuthRedirect()

  const verifyBackupCode = useMutation({
    ...verifyBackupCodeMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      toast.success(t("success"))
      await redirectAfterAuth()
    },
  })

  const form = useForm({
    defaultValues: { code: "", trustDevice: true },
    onSubmit: ({ value }) => {
      verifyBackupCode.mutate(value)
    },
    validators: { onChange: backupCodeSchema, onSubmit: backupCodeSchema },
  })

  return (
    <form
      className="flex flex-col gap-6"
      id="two-factor-backup-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="code">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel className="text-body-sm text-foreground" htmlFor="two-factor-backup-code">
                {t("backupCode")}
              </FieldLabel>
              <Input
                aria-describedby={isInvalid ? "two-factor-backup-code-error" : undefined}
                aria-invalid={isInvalid}
                autoComplete="one-time-code"
                className="h-11 px-3 font-mono tracking-wider text-foreground transition-[border-color,box-shadow] duration-200 ease-exp"
                id="two-factor-backup-code"
                name={field.name}
                onBlur={field.handleBlur}
                onChange={(event) => {
                  field.handleChange(event.target.value)
                }}
                value={field.state.value}
              />
              {isInvalid && (
                <ValidationFieldError
                  id="two-factor-backup-code-error"
                  message={fieldErrorMessage(field.state.meta.errors)}
                  namespace="auth.validations"
                  params={AUTH_VALIDATION_PARAMS}
                />
              )}
            </Field>
          )
        }}
      </form.Field>

      <Button className={SUBMIT_CLASS} data-testid="two-factor-backup-submit-button" isPending={verifyBackupCode.isPending} type="submit">
        {verifyBackupCode.isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
        {t(verifyBackupCode.isPending ? "submitting" : "submit")}
      </Button>
    </form>
  )
}

export const TwoFactorForm = (): JSX.Element => {
  const t = useTranslations("pages.auth.two-factor")
  const [usesBackupCode, setUsesBackupCode] = useState(false)

  return (
    <>
      {usesBackupCode && <BackupCodeForm />}
      {!usesBackupCode && <TotpForm />}
      <Button
        className="h-11 w-full gap-2 bg-transparent text-body-sm text-foreground transition-[background-color,border-color,color,transform] dark:border-border dark:bg-transparent dark:hover:bg-muted"
        onPress={() => {
          setUsesBackupCode(!usesBackupCode)
        }}
        variant="outline"
      >
        {t(usesBackupCode ? "form.useAuthenticator" : "form.useBackupCode")}
      </Button>
    </>
  )
}
