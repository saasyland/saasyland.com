import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { accountZodSchemas } from "~/src/modules/account/account.zod"
import { changeEmailMutation } from "~/src/modules/account/use-cases/change-email"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import { ROUTES } from "~/src/routes"

const newEmailSchema = accountZodSchemas.changeEmail.pick({ newEmail: true })

export const ChangeEmailForm = ({ onDone }: { readonly onDone: () => void }): JSX.Element => {
  const t = useTranslations("components.custom.change-email-form")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const router = useRouter()

  const { hrefWithRedirect } = useAuthRedirect()

  const currentUser = useSuspenseQuery(getCurrentSessionQuery).data?.user

  const changeEmail = useMutation({
    ...changeEmailMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async (_, { newEmail }) => {
      if (currentUser?.emailVerified === true) {
        toast.success(t("confirmationSent", { email: currentUser.email, newEmail }))
        onDone()
        return
      }
      const session = await queryClient.query({ ...getCurrentSessionQuery, staleTime: 0 })
      if (session?.user.email === newEmail.trim().toLowerCase()) {
        toast.success(t("changed", { email: session.user.email }))
        onDone()
        return
      }
      toast.error(t("unchanged", { email: newEmail }))
    },
  })

  const form = useForm({
    defaultValues: { newEmail: "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      const returnHere = router.buildLocation({
        search: { redirect: router.state.location.publicHref },
        to: ROUTES.AUTH_CALLBACK,
      }).publicHref
      const callbackURL = currentUser?.emailVerified === true ? returnHere : hrefWithRedirect(ROUTES.AUTH_CALLBACK)
      changeEmail.mutate({ callbackURL, newEmail: value.newEmail })
    },
    validators: { onChange: newEmailSchema },
  })

  return (
    <form
      className="flex flex-col gap-3"
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <form.Field name="newEmail">
        {(field) => {
          const isInvalid = isFieldInvalid(field)

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel className="text-body-sm text-foreground" htmlFor="change-email-new-email">
                {t("label")}
              </FieldLabel>
              <Input
                aria-describedby="change-email-new-email-error"
                aria-invalid={isInvalid}
                autoComplete="email"
                autoFocus
                className="h-11 px-3 text-foreground transition-[border-color,box-shadow] duration-200 ease-exp"
                id="change-email-new-email"
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
                  id="change-email-new-email-error"
                  message={fieldErrorMessage(field.state.meta.errors)}
                  namespace="auth.validations"
                  params={AUTH_VALIDATION_PARAMS}
                />
              )}
            </Field>
          )
        }}
      </form.Field>
      <div className="flex flex-wrap gap-3">
        <Button className="h-11 gap-2 px-5 text-body-sm font-semibold" isPending={changeEmail.isPending} type="submit">
          {changeEmail.isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
          {t(changeEmail.isPending ? "submitting" : "submit")}
        </Button>
        <Button className="h-11 px-5 text-body-sm" onPress={onDone} variant="ghost">
          {t("cancel")}
        </Button>
      </div>
    </form>
  )
}
