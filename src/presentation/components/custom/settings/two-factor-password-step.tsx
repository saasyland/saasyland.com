import { type JSX, useId } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { TWO_FACTOR_METHOD } from "~/src/modules/two-factor/two-factor.constants"
import { twoFactorZodSchemas } from "~/src/modules/two-factor/two-factor.zod"
import { disableTwoFactorMutation } from "~/src/modules/two-factor/use-cases/disable-two-factor"
import { enableTwoFactorMutation } from "~/src/modules/two-factor/use-cases/enable-two-factor"
import { generateBackupCodesMutation } from "~/src/modules/two-factor/use-cases/generate-backup-codes"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { TWO_FACTOR_INTENT, type TwoFactorIntent } from "~/src/data/auth"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"

import { PasswordInput } from "~/src/presentation/components/custom/auth/password-input"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const passwordSchema = twoFactorZodSchemas.enableTwoFactor

interface TwoFactorPasswordStepProps {
  readonly intent: TwoFactorIntent
  readonly onBackupCodes: (backupCodes: readonly string[]) => void
  readonly onDisabled: () => void
  readonly onEnabled: (totpUri: string, backupCodes: readonly string[]) => void
}

export const TwoFactorPasswordStep = ({ intent, onBackupCodes, onDisabled, onEnabled }: TwoFactorPasswordStepProps): JSX.Element => {
  const t = useTranslations("auth.security.twoFactor")
  const passwordId = useId()

  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const onError = (error: Error): void => {
    toast.error(errorMessage(error))
  }
  const enableTwoFactor = useMutation({ ...enableTwoFactorMutation, onError })
  const disableTwoFactor = useMutation({
    ...disableTwoFactorMutation,
    onError,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL }),
  })
  const generateBackupCodes = useMutation({ ...generateBackupCodesMutation, onError })

  const form = useForm({
    defaultValues: { password: "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      if (intent === TWO_FACTOR_INTENT.DISABLE) {
        disableTwoFactor.mutate(value, {
          onSuccess: () => {
            toast.success(t("disabled"))
            onDisabled()
          },
        })
        return
      }
      if (intent === TWO_FACTOR_INTENT.REGENERATE) {
        generateBackupCodes.mutate(value, {
          onSuccess: ({ backupCodes }) => {
            toast.success(t("regenerated"))
            onBackupCodes(backupCodes)
          },
        })
        return
      }
      enableTwoFactor.mutate(value, {
        onSuccess: (result) => {
          if (result.method !== TWO_FACTOR_METHOD.TOTP) {
            toast.error(t("setupError"))
            return
          }
          onEnabled(result.totpURI, result.backupCodes)
        },
      })
    },
    validators: { onChange: passwordSchema },
  })

  const isPending = enableTwoFactor.isPending || disableTwoFactor.isPending || generateBackupCodes.isPending

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <FieldGroup className="gap-4">
        <form.Field name="password">
          {(field) => {
            const isInvalid = isFieldInvalid(field)

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={passwordId}>{t("password")}</FieldLabel>
                <PasswordInput
                  aria-describedby={`${passwordId}-error`}
                  aria-invalid={isInvalid}
                  autoComplete="current-password"
                  id={passwordId}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                  value={field.state.value}
                />
                {isInvalid && (
                  <ValidationFieldError
                    id={`${passwordId}-error`}
                    message={fieldErrorMessage(field.state.meta.errors)}
                    namespace="auth.validations"
                    params={AUTH_VALIDATION_PARAMS}
                  />
                )}
              </Field>
            )
          }}
        </form.Field>

        <Button isPending={isPending} type="submit" variant={intent === TWO_FACTOR_INTENT.DISABLE ? "destructive" : "default"}>
          {t(`confirm.${intent}`)}
        </Button>
      </FieldGroup>
    </form>
  )
}
