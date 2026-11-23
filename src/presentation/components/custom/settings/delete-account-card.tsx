import { type JSX, useId, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_PROVIDER, EMAIL_LINK_LIFETIME_HOURS } from "~/src/integrations/better-auth/auth.constants"
import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { listAccountsQuery } from "~/src/modules/account/use-cases/list-accounts"
import { requestAccountDeletionMutation } from "~/src/modules/user/use-cases/request-account-deletion"
import { userZodSchemas } from "~/src/modules/user/user.zod"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { ACCOUNT_DELETION_NOTICES } from "~/src/data/account-deletion"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "~/src/presentation/components/shadcn/dialog"
import { Field, FieldLabel } from "~/src/presentation/components/shadcn/field"

import { PasswordInput } from "~/src/presentation/components/custom/auth/password-input"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import * as ROUTES from "~/src/routes"

const passwordSchema = userZodSchemas.requestAccountDeletion.pick({ password: true }).required()

export const AccountDeletionConsequences = (): JSX.Element => {
  const t = useTranslations("auth.security.delete")

  return (
    <ul className="flex list-disc flex-col gap-2 pl-5 text-sm text-pretty text-muted-foreground">
      <li>{t("consequences")}</li>
      {ACCOUNT_DELETION_NOTICES.map(({ key, Notice }) => (
        <Notice key={key} />
      ))}
    </ul>
  )
}

const DeletionRequestForm = ({ onSent }: { readonly onSent: () => void }): JSX.Element => {
  const t = useTranslations("auth.security.delete")
  const passwordId = useId()
  const router = useRouter()
  const errorMessage = useErrorMessage()

  const hasPassword = useSuspenseQuery(listAccountsQuery).data.some(({ providerId }) => providerId === AUTH_PROVIDER.CREDENTIAL)

  const requestDeletion = useMutation({
    ...requestAccountDeletionMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: onSent,
  })

  const form = useForm({
    defaultValues: { password: "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      const callbackURL = router.buildLocation({ to: ROUTES.APP_DELETE_ACCOUNT }).publicHref
      requestDeletion.mutate(hasPassword ? { callbackURL, password: value.password } : { callbackURL })
    },
    validators: hasPassword ? { onChange: passwordSchema } : {},
  })

  return (
    <form
      className="flex flex-col gap-4"
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      {hasPassword && (
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
      )}
      <DialogFooter>
        <DialogClose>{t("cancel")}</DialogClose>
        <Button isPending={requestDeletion.isPending} type="submit" variant="destructive">
          {t("send")}
        </Button>
      </DialogFooter>
    </form>
  )
}

export const DeleteAccountCard = (): JSX.Element => {
  const t = useTranslations("auth.security.delete")

  const [isOpen, setOpen] = useState(false)
  const [isSent, setSent] = useState(false)

  const email = useSuspenseQuery(getCurrentSessionQuery).data?.user.email ?? ""

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <AccountDeletionConsequences />
        {isSent && (
          <p className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm text-pretty text-foreground" role="status">
            {t("sent", { email, hours: EMAIL_LINK_LIFETIME_HOURS })}
          </p>
        )}
        <Button
          className="self-end"
          onPress={() => {
            setOpen(true)
          }}
          size="sm"
          variant="destructive"
        >
          {t("start")}
        </Button>
      </CardContent>
      <Dialog className="sm:max-w-md" isOpen={isOpen} onOpenChange={setOpen}>
        <DialogHeader>
          <DialogTitle>{t("dialogTitle")}</DialogTitle>
          <DialogDescription>{t("dialogDescription")}</DialogDescription>
        </DialogHeader>
        <DeletionRequestForm
          onSent={() => {
            setOpen(false)
            setSent(true)
          }}
        />
      </Dialog>
    </Card>
  )
}
