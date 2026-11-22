import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"
import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { showFieldError, submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { INVITATION_QUERY_KEYS } from "~/src/modules/invitation/invitation.constants"
import { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"
import { acceptInvitationMutation } from "~/src/modules/invitation/use-cases/accept-invitation"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { PasswordInput } from "~/src/presentation/components/custom/auth/password-input"
import { PasswordRequirements } from "~/src/presentation/components/custom/auth/password-requirements"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import { APP_NAME } from "~/src/presentation/branding"

const formSchema = invitationZodSchemas.acceptInvitation.omit({ token: true })

interface AcceptInvitationFormProps {
  readonly email: string
  readonly token: string
}

export const AcceptInvitationForm = ({ email, token }: AcceptInvitationFormProps): JSX.Element => {
  const t = useTranslations()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const { finishSignIn } = useAuthRedirect()

  const accept = useMutation({
    ...acceptInvitationMutation,
    onError: () => queryClient.invalidateQueries({ queryKey: INVITATION_QUERY_KEYS.DETAIL }),
    onSuccess: async () => {
      await finishSignIn()
      toast.success(t("pages.auth.invite.welcome", { appName: APP_NAME }))
    },
  })

  const form = useForm({
    defaultValues: { name: "", password: "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ formApi, value }) => {
      accept.mutate(
        { ...value, token },
        {
          onError: (error) => {
            if (error.message === AUTH_ERRORS.PASSWORD_COMPROMISED) {
              showFieldError(formApi, { controlId: "invite-password", field: "password", message: error.message })
              return
            }
            toast.error(errorMessage(error))
          },
        },
      )
    },
    validators: { onChange: formSchema },
  })

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel className="text-body-sm text-foreground" htmlFor="invite-email">
            {t("pages.auth.invite.form.email")}
          </FieldLabel>
          <Input className="h-11 px-3 text-foreground" id="invite-email" readOnly type="email" value={email} />
        </Field>
        <form.Field name="name">
          {(field) => {
            const isInvalid = isFieldInvalid(field)

            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel className="text-body-sm text-foreground" htmlFor="invite-name">
                  {t("pages.auth.invite.form.name")}
                </FieldLabel>
                <Input
                  aria-describedby="invite-name-error"
                  aria-invalid={isInvalid}
                  autoComplete="name"
                  className="h-11 px-3 text-foreground transition-[border-color,box-shadow] duration-200 ease-exp"
                  id="invite-name"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                  placeholder={t("auth.form.placeholders.name")}
                  value={field.state.value}
                />
                {isInvalid && (
                  <ValidationFieldError
                    id="invite-name-error"
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
                <FieldLabel className="text-body-sm text-foreground" htmlFor="invite-password">
                  {t("pages.auth.invite.form.password")}
                </FieldLabel>
                <PasswordInput
                  aria-describedby="invite-password-error invite-password-requirements"
                  aria-invalid={isInvalid}
                  autoComplete="new-password"
                  id="invite-password"
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                  value={field.state.value}
                />
                {isInvalid && (
                  <ValidationFieldError
                    id="invite-password-error"
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
        {(password) => <PasswordRequirements id="invite-password-requirements" password={password} />}
      </form.Subscribe>

      <Button
        className="h-11 w-full gap-2 px-5 text-body-sm font-semibold transition-[background-color,color,transform]"
        isPending={accept.isPending}
        type="submit"
      >
        {accept.isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
        {t(accept.isPending ? "pages.auth.invite.form.submitting" : "pages.auth.invite.form.submit")}
      </Button>
    </form>
  )
}
