import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import { AUTH_PROVIDER } from "~/src/integrations/better-auth/auth.constants"
import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"
import { type StringField, fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { showFieldError, submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { ACCOUNT_QUERY_KEYS } from "~/src/modules/account/account.constants"
import { accountZodSchemas } from "~/src/modules/account/account.zod"
import { changePasswordMutation } from "~/src/modules/account/use-cases/change-password"
import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import { setPasswordMutation } from "~/src/modules/account/use-cases/set-password"
import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { OAUTH_PROVIDERS } from "~/src/data/auth"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"

import { PasswordInput } from "~/src/presentation/components/custom/auth/password-input"
import { PasswordRequirements } from "~/src/presentation/components/custom/auth/password-requirements"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const REQUIREMENTS_ID = "settings-password-requirements"

const changePasswordSchema = accountZodSchemas.changePassword
const setPasswordSchema = accountZodSchemas.setPassword

interface PasswordFieldProps {
  readonly autoComplete: "current-password" | "new-password"
  readonly field: StringField & { readonly state: { readonly value: string } }
  readonly label: string
}

const PasswordField = ({ autoComplete, field, label }: PasswordFieldProps): JSX.Element => {
  const isInvalid = isFieldInvalid(field)
  const isNew = autoComplete === "new-password"

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <PasswordInput
        aria-describedby={isNew ? `${field.name}-error ${REQUIREMENTS_ID}` : `${field.name}-error`}
        aria-invalid={isInvalid}
        autoComplete={autoComplete}
        id={field.name}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.value)
        }}
        value={field.state.value}
      />
      {isInvalid && (
        <ValidationFieldError
          id={`${field.name}-error`}
          message={fieldErrorMessage(field.state.meta.errors)}
          namespace="auth.validations"
          params={AUTH_VALIDATION_PARAMS}
        />
      )}
      {isNew && <PasswordRequirements id={REQUIREMENTS_ID} password={field.state.value} />}
    </Field>
  )
}

const useRefreshAfterPasswordSaved = () => {
  const queryClient = useQueryClient()

  return async (): Promise<void> => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL }),
      queryClient.invalidateQueries({ queryKey: ACCOUNT_QUERY_KEYS.ALL }),
    ])
  }
}

const ChangePasswordForm = (): JSX.Element => {
  const t = useTranslations("auth.security.password")
  const errorMessage = useErrorMessage()
  const refreshAfterPasswordSaved = useRefreshAfterPasswordSaved()

  const changePassword = useMutation({
    ...changePasswordMutation,
    onSuccess: async () => {
      await refreshAfterPasswordSaved()
      toast.success(t("updated"))
    },
  })

  const form = useForm({
    defaultValues: { currentPassword: "", newPassword: "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ formApi, value }) => {
      changePassword.mutate(value, {
        onError: (error) => {
          if (error.message === AUTH_ERRORS.PASSWORD_COMPROMISED) {
            showFieldError(formApi, { controlId: "newPassword", field: "newPassword", message: error.message })
            return
          }
          toast.error(errorMessage(error))
        },
        onSuccess: () => {
          formApi.reset()
        },
      })
    },
    validators: { onChange: changePasswordSchema },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <CardContent className="pb-(--card-spacing)">
        <FieldGroup className="max-w-md gap-4">
          <form.Field name="currentPassword">
            {(field) => <PasswordField autoComplete="current-password" field={field} label={t("current")} />}
          </form.Field>
          <form.Field name="newPassword">
            {(field) => <PasswordField autoComplete="new-password" field={field} label={t("new")} />}
          </form.Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end">
        <Button isPending={changePassword.isPending} size="sm" type="submit">
          {t("update")}
        </Button>
      </CardFooter>
    </form>
  )
}

const SetPasswordForm = (): JSX.Element => {
  const t = useTranslations("auth.security.password")
  const errorMessage = useErrorMessage()
  const refreshAfterPasswordSaved = useRefreshAfterPasswordSaved()

  const setPassword = useMutation({
    ...setPasswordMutation,
    onSuccess: async () => {
      await refreshAfterPasswordSaved()
      toast.success(t("added"))
    },
  })

  const form = useForm({
    defaultValues: { newPassword: "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ formApi, value }) => {
      setPassword.mutate(value, {
        onError: (error) => {
          if (error.message === AUTH_ERRORS.PASSWORD_COMPROMISED) {
            showFieldError(formApi, { controlId: "newPassword", field: "newPassword", message: error.message })
            return
          }
          toast.error(errorMessage(error))
        },
        onSuccess: () => {
          formApi.reset()
        },
      })
    },
    validators: { onChange: setPasswordSchema },
  })

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <CardContent className="pb-(--card-spacing)">
        <FieldGroup className="max-w-md gap-4">
          <form.Field name="newPassword">
            {(field) => <PasswordField autoComplete="new-password" field={field} label={t("new")} />}
          </form.Field>
        </FieldGroup>
      </CardContent>
      <CardFooter className="justify-end">
        <Button isPending={setPassword.isPending} size="sm" type="submit">
          {t("set")}
        </Button>
      </CardFooter>
    </form>
  )
}

export const PasswordCard = (): JSX.Element => {
  const t = useTranslations("auth.security.password")
  const format = useFormatter()

  const accounts = useSuspenseQuery(listAccountsQuery).data

  const hasPassword = accounts.some(({ providerId }) => providerId === AUTH_PROVIDER.CREDENTIAL)
  const providers = OAUTH_PROVIDERS.filter(({ id }) => accounts.some(({ providerId }) => providerId === id)).map(({ name }) => name)

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{hasPassword ? t("title") : t("setTitle")}</h2>
        </CardTitle>
        <CardDescription>
          {hasPassword && t("description")}
          {!hasPassword && t("setDescription", { providers: format.list(providers) })}
        </CardDescription>
      </CardHeader>
      {hasPassword && <ChangePasswordForm />}
      {!hasPassword && <SetPasswordForm />}
    </Card>
  )
}
