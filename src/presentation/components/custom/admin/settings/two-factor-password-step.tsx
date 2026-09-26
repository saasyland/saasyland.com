import { type JSX, useId } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { twoFactorZodSchemas } from "~/src/modules/two-factor/two-factor.zod"
import { disableTwoFactorMutation } from "~/src/modules/two-factor/use-cases/disable-two-factor"
import { enableTwoFactorMutation } from "~/src/modules/two-factor/use-cases/enable-two-factor"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const passwordSchema = twoFactorZodSchemas.enableTwoFactor

const useSessionMutationOptions = () => {
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  return {
    onError: (error: Error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL }),
  }
}

export const TwoFactorPasswordStep = ({
  isDisabling,
  onDisabled,
  onEnabled,
}: {
  readonly isDisabling: boolean
  readonly onDisabled: () => void
  readonly onEnabled: (totpUri: string, backupCodes: readonly string[]) => void
}): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.twoFactor")

  const passwordId = useId()

  const sessionMutationOptions = useSessionMutationOptions()
  const enableTwoFactor = useMutation({ ...enableTwoFactorMutation, ...sessionMutationOptions })
  const disableTwoFactor = useMutation({ ...disableTwoFactorMutation, ...sessionMutationOptions })

  const form = useForm({
    defaultValues: { password: "" },
    onSubmit: ({ value }) => {
      if (isDisabling) {
        disableTwoFactor.mutate(value, { onSuccess: onDisabled })
        return
      }

      enableTwoFactor.mutate(value, {
        onSuccess: (result) => {
          if (result.method !== "totp") {
            toast.error(t("setupError"))
            return
          }
          onEnabled(result.totpURI, result.backupCodes)
        },
      })
    },
    validators: { onChange: passwordSchema, onSubmit: passwordSchema },
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
        <form.Field name="password">
          {(field) => {
            const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={passwordId}>{t("password")}</FieldLabel>
                <Input
                  aria-invalid={isInvalid}
                  autoComplete="current-password"
                  id={passwordId}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                  type="password"
                  value={field.state.value}
                />
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

        {isDisabling && (
          <Button isPending={disableTwoFactor.isPending} type="submit" variant="destructive">
            {t("disableConfirm")}
          </Button>
        )}
        {!isDisabling && (
          <Button isPending={enableTwoFactor.isPending} type="submit">
            {t("continue")}
          </Button>
        )}
      </FieldGroup>
    </form>
  )
}
