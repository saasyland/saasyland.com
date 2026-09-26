import { type JSX, useId } from "react"

import { useForm } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { NEWSLETTER_SUBSCRIBER_QUERY_KEYS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import { subscribeToNewsletterMutation } from "~/src/modules/newsletter-subscriber/use-cases/subscribe-to-newsletter"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { cn } from "~/src/lib/cn"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const emailSchema = newsletterSubscriberZodSchemas.subscribeToNewsletter.pick({ email: true })

export const NewsletterForm = (): JSX.Element => {
  const t = useTranslations("components.custom.newsletter-form")
  const inputId = useId()
  const errorMessage = useErrorMessage()
  const queryClient = useQueryClient()

  const subscribe = useMutation({
    ...subscribeToNewsletterMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: ({ status }) => {
      toast.success(t(status))
      return queryClient.invalidateQueries({ queryKey: NEWSLETTER_SUBSCRIBER_QUERY_KEYS.ALL })
    },
  })

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: ({ value, formApi }) => {
      subscribe.mutate(
        { email: value.email, locale: getCurrentLocale() },
        {
          onSuccess: () => {
            formApi.reset()
          },
        },
      )
    },
    validators: { onChange: emailSchema, onSubmit: emailSchema },
  })

  return (
    <form
      className="mt-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        void form.handleSubmit()
      }}
    >
      <form.Field name="email">
        {(field) => {
          const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid

          return (
            <Field data-invalid={isInvalid}>
              <FieldLabel className="sr-only" htmlFor={inputId}>
                {t("label")}
              </FieldLabel>
              <div
                className={cn("flex items-center gap-4 border-b transition-colors duration-200 ease-exp", {
                  "border-border focus-within:border-foreground": !isInvalid,
                  "border-destructive": isInvalid,
                })}
              >
                <Input
                  aria-describedby={`${inputId}-error`}
                  aria-invalid={isInvalid}
                  autoComplete="email"
                  className="h-11 rounded-none border-0 bg-transparent px-3 font-sans text-body-sm font-medium text-foreground focus-visible:ring-0 aria-invalid:ring-0 dark:bg-transparent"
                  disabled={subscribe.isPending}
                  id={inputId}
                  name={field.name}
                  onBlur={field.handleBlur}
                  onChange={(event) => {
                    field.handleChange(event.target.value)
                  }}
                  placeholder={t("placeholder")}
                  type="email"
                  value={field.state.value}
                />
                <Button
                  className="group/cta h-11 shrink-0 gap-2 px-0 font-sans text-body-sm font-semibold text-foreground hover:bg-transparent hover:text-muted-foreground"
                  isPending={subscribe.isPending}
                  type="submit"
                  variant="ghost"
                >
                  {subscribe.isPending && <Spinner />}
                  {subscribe.isPending ? t("submitting") : t("button")}
                  {!subscribe.isPending && (
                    <ArrowRight
                      aria-hidden
                      className="size-4 transition-transform duration-200 ease-exp group-hover/cta:translate-x-0.5"
                      strokeWidth={1.5}
                    />
                  )}
                </Button>
              </div>
              <div className="min-h-5 font-mono text-spec" id={`${inputId}-error`}>
                {isInvalid && (
                  <ValidationFieldError
                    message={fieldErrorMessage(field.state.meta.errors)}
                    namespace="auth.validations"
                    params={AUTH_VALIDATION_PARAMS}
                  />
                )}
              </div>
            </Field>
          )
        }}
      </form.Field>
    </form>
  )
}
