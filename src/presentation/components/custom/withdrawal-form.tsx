import { type JSX, useEffect, useId, useRef } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { type StringField, fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { submitWithdrawalMutation } from "~/src/modules/withdrawal/use-cases/submit-withdrawal"
import { WITHDRAWAL_VALIDATION_PARAMS } from "~/src/modules/withdrawal/withdrawal.constants"
import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"
import { withdrawalZodSchemas } from "~/src/modules/withdrawal/withdrawal.zod"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { REFUND_TERMS } from "~/src/data/refunds"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const statementSchema = withdrawalZodSchemas.submitWithdrawal.pick({ email: true, name: true, reference: true })

export type WithdrawalStatementFields = Pick<Withdrawal["submitWithdrawal"], "email" | "name" | "reference">

const EMPTY_STATEMENT: WithdrawalStatementFields = { email: "", name: "", reference: "" }

const RECEIPT_DETAILS = ["name", "reference", "email"] as const

interface WithdrawalTextFieldProps {
  readonly autoComplete: "email" | "name" | "off"
  readonly description?: string
  readonly field: StringField
  readonly id: string
  readonly label: string
  readonly type?: "email" | "text"
}

const WithdrawalTextField = ({ autoComplete, description, field, id, label, type = "text" }: WithdrawalTextFieldProps): JSX.Element => {
  const isInvalid = isFieldInvalid(field)

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        aria-describedby={`${id}-description ${id}-error`}
        aria-invalid={isInvalid}
        autoComplete={autoComplete}
        id={id}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.value)
        }}
        type={type}
        value={field.state.value}
      />
      {description !== undefined && <FieldDescription id={`${id}-description`}>{description}</FieldDescription>}
      {isInvalid && (
        <ValidationFieldError
          id={`${id}-error`}
          message={fieldErrorMessage(field.state.meta.errors)}
          namespace="withdrawal.validations"
          params={WITHDRAWAL_VALIDATION_PARAMS}
        />
      )}
    </Field>
  )
}

const WithdrawalReceipt = ({ receipt }: { readonly receipt: Withdrawal["receipt"] }): JSX.Element => {
  const t = useTranslations()
  const heading = useRef<HTMLHeadingElement>(null)

  const acknowledgement = receipt.acknowledged ? "acknowledged" : "unacknowledged"

  useEffect(() => {
    heading.current?.focus()
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <h3 className="text-lg font-medium text-foreground outline-none" ref={heading} tabIndex={-1}>
        {t("pages.withdrawal.receipt.title")}
      </h3>
      <p className="text-sm text-foreground">
        {t("pages.withdrawal.receipt.submittedAt", { submittedAt: t("auth.dates.dateTime", { value: receipt.submittedAt }) })}
      </p>
      <div className="flex flex-col gap-3 rounded-lg border border-border bg-muted/40 p-4">
        <p className="text-sm font-medium text-foreground">{t("pages.withdrawal.receipt.content")}</p>
        <p className="text-sm text-foreground">{t("pages.withdrawal.form.statement")}</p>
        <dl className="flex flex-col gap-2 text-sm">
          {RECEIPT_DETAILS.map((detail) => (
            <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3" key={detail}>
              <dt className="text-muted-foreground sm:w-48 sm:shrink-0">{t(`pages.withdrawal.receipt.details.${detail}`)}</dt>
              <dd className="font-medium wrap-break-word text-foreground">{receipt[detail]}</dd>
            </div>
          ))}
        </dl>
      </div>
      <p className="text-sm text-muted-foreground">{t(`pages.withdrawal.receipt.${acknowledgement}`, { email: receipt.email })}</p>
      <p className="text-sm text-muted-foreground">{t("pages.withdrawal.receipt.next", { days: REFUND_TERMS.REIMBURSEMENT_DAYS })}</p>
    </div>
  )
}

interface WithdrawalFormProps {
  readonly defaultValues?: WithdrawalStatementFields
  readonly onSubmitted?: () => Promise<void>
}

export const WithdrawalForm = ({ defaultValues = EMPTY_STATEMENT, onSubmitted }: WithdrawalFormProps): JSX.Element => {
  const t = useTranslations("pages.withdrawal.form")
  const id = useId()
  const errorMessage = useErrorMessage()

  const submit = useMutation({
    ...submitWithdrawalMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      await onSubmitted?.()
    },
  })

  const form = useForm({
    defaultValues,
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      submit.mutate({ ...value, locale: getCurrentLocale() })
    },
    validators: { onChange: statementSchema },
  })

  if (submit.data !== undefined) {
    return <WithdrawalReceipt receipt={submit.data} />
  }

  return (
    <form
      className="flex flex-col gap-6"
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form)
      }}
    >
      <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-foreground">{t("statement")}</p>
      <FieldGroup>
        <form.Field name="name">
          {(field) => <WithdrawalTextField autoComplete="name" field={field} id={`${id}-name`} label={t("name")} />}
        </form.Field>
        <form.Field name="email">
          {(field) => (
            <WithdrawalTextField
              autoComplete="email"
              description={t("emailDescription")}
              field={field}
              id={`${id}-email`}
              label={t("email")}
              type="email"
            />
          )}
        </form.Field>
        <form.Field name="reference">
          {(field) => (
            <WithdrawalTextField
              autoComplete="off"
              description={t("referenceDescription")}
              field={field}
              id={`${id}-reference`}
              label={t("reference")}
            />
          )}
        </form.Field>
      </FieldGroup>
      <Button className="w-fit" isPending={submit.isPending} type="submit">
        {t("confirm")}
      </Button>
    </form>
  )
}
