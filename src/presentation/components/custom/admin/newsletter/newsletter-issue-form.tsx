import { type JSX, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useSuspenseQuery } from "@tanstack/react-query"
import { useRouter } from "@tanstack/react-router"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"
import { v7 } from "uuid"

import { type StringField, fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import {
  NEWSLETTER_ISSUE_STATUS,
  NEWSLETTER_ISSUE_TEXT,
  NEWSLETTER_ISSUE_VALIDATION_PARAMS,
  type NewsletterIssueText,
} from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import type { NewsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.types"
import { newsletterIssueZodSchemas } from "~/src/modules/newsletter-issue/newsletter-issue.zod"
import { createNewsletterIssueMutation } from "~/src/modules/newsletter-issue/use-cases/create-newsletter-issue"
import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"

import { useErrorMessage } from "~/src/hooks/use-error-message"
import { useFormLocale } from "~/src/hooks/use-form-locale"
import { useNewsletterSending } from "~/src/hooks/use-newsletter-sending"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "~/src/presentation/components/shadcn/alert-dialog"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

import { FormLanguages } from "~/src/presentation/components/custom/admin/form-languages"
import { NewsletterIssuePreview } from "~/src/presentation/components/custom/admin/newsletter/newsletter-issue-preview"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import * as ROUTES from "~/src/routes"

const NEW_ISSUE: NewsletterIssue["issueTexts"] = { body: { [I18N.DEFAULT_LOCALE]: "" }, subject: { [I18N.DEFAULT_LOCALE]: "" } }

interface IssueFieldProps {
  readonly field: StringField
  readonly label: string
  readonly locale: SupportedLocale
  readonly text: NewsletterIssueText
}

const IssueField = ({ field, label, locale, text }: IssueFieldProps): JSX.Element => {
  const id = `newsletter-issue-${text}-${locale}`
  const control = {
    "aria-describedby": `${id}-error`,
    "aria-invalid": isFieldInvalid(field),
    id,
    lang: locale,
    name: field.name,
    onBlur: field.handleBlur,
    value: field.state.value ?? "",
  }

  return (
    <Field data-invalid={isFieldInvalid(field)}>
      <div className="flex items-center justify-between gap-3">
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <span className="font-mono text-spec text-muted-foreground">{locale}</span>
      </div>
      {text === NEWSLETTER_ISSUE_TEXT.SUBJECT && (
        <Input
          {...control}
          onChange={(event) => {
            field.handleChange(event.target.value)
          }}
        />
      )}
      {text === NEWSLETTER_ISSUE_TEXT.BODY && (
        <Textarea
          {...control}
          className="min-h-80"
          onChange={(event) => {
            field.handleChange(event.target.value)
          }}
        />
      )}
      {isFieldInvalid(field) && (
        <ValidationFieldError
          id={`${id}-error`}
          message={fieldErrorMessage(field.state.meta.errors)}
          namespace="newsletter-issue.validations"
          params={NEWSLETTER_ISSUE_VALIDATION_PARAMS}
        />
      )}
    </Field>
  )
}

const useIssueSending = () => {
  const router = useRouter()
  const errorMessage = useErrorMessage()
  const [issueId] = useState(() => v7())

  const create = useMutation({
    ...createNewsletterIssueMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
  })
  const sending = useNewsletterSending()

  return {
    isPending: create.isPending || sending.isPending,
    send: (texts: NewsletterIssue["issueTexts"]) => {
      create.mutate(
        { ...texts, issueId },
        {
          onSuccess: () => {
            sending.mutate(
              { issueId },
              {
                onSuccess: ({ status }) => {
                  if (status === NEWSLETTER_ISSUE_STATUS.SENT) {
                    void router.navigate({ to: ROUTES.ADMIN_NEWSLETTER_ISSUES })
                  }
                },
              },
            )
          },
        },
      )
    },
  }
}

export const NewsletterIssueForm = (): JSX.Element => {
  const t = useTranslations("pages.admin.newsletter.compose")
  const [isConfirming, setConfirming] = useState(false)

  const recipients = useSuspenseQuery(newsletterSubscribersQuery).data.total
  const { isPending, send } = useIssueSending()

  const form = useForm({
    defaultValues: NEW_ISSUE,
    listeners: { onBlur: validateOnBlur },
    onSubmit: () => {
      setConfirming(true)
    },
    validators: { onChange: newsletterIssueZodSchemas.issueTexts },
  })

  const languages = useFormLocale(form, ({ body, subject }) => ({ texts: { body, subject } }))
  const { locale, texts } = languages

  return (
    <div className="grid items-start gap-6 lg:grid-cols-2">
      <form
        noValidate
        onSubmit={(event) => {
          void submitForm(event, form, languages.showFirstInvalid)
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle>
              <h2>{t("form.title")}</h2>
            </CardTitle>
            <CardDescription>{t("form.description")}</CardDescription>
          </CardHeader>
          <CardContent>
            <FieldGroup>
              <FormLanguages languages={languages} />
              <form.Field key={`subject-${locale}`} name={`subject.${locale}`}>
                {(field) => <IssueField field={field} label={t("form.subject")} locale={locale} text={NEWSLETTER_ISSUE_TEXT.SUBJECT} />}
              </form.Field>
              <form.Field key={`body-${locale}`} name={`body.${locale}`}>
                {(field) => <IssueField field={field} label={t("form.body")} locale={locale} text={NEWSLETTER_ISSUE_TEXT.BODY} />}
              </form.Field>
              <p className="text-spec text-muted-foreground">{t("form.hint")}</p>
            </FieldGroup>
          </CardContent>
          <CardFooter className="flex-wrap justify-between gap-3">
            <span className="text-body-sm text-muted-foreground">{t("form.recipients", { count: recipients })}</span>
            <Button isDisabled={recipients === 0} isPending={isPending} type="submit">
              {t("form.send")}
            </Button>
          </CardFooter>
        </Card>
      </form>
      <NewsletterIssuePreview locale={locale} texts={texts} />
      <AlertDialog isOpen={isConfirming} onOpenChange={setConfirming}>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("confirm.title")}</AlertDialogTitle>
          <AlertDialogDescription>{t("confirm.description", { count: recipients })}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("confirm.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onPress={() => {
              send(form.state.values)
            }}
          >
            {t("confirm.send")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialog>
    </div>
  )
}
