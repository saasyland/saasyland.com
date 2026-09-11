import { type JSX } from "react"

import { useForm, useSelector } from "@tanstack/react-form"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useLocale, useTranslations } from "use-intl/react"

import { fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"

import { NEWSLETTER_SUBSCRIBER_QUERY_KEYS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import { subscribeToNewsletterMutation } from "~/src/modules/newsletter-subscriber/use-cases/subscribe-to-newsletter"

import { useActionError } from "~/src/hooks/use-action-error"

import { NewsletterSubscriptionFields } from "~/src/presentation/components/custom/newsletter/newsletter-subscription-fields"

const emailSchema = newsletterSubscriberZodSchemas.subscribeToNewsletter.pick({ email: true })

export const NewsletterSubscriptionFormClient = (): JSX.Element => {
  const queryClient = useQueryClient()
  const subscribeToNewsletterRequest = useMutation({
    ...subscribeToNewsletterMutation,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: NEWSLETTER_SUBSCRIBER_QUERY_KEYS.ALL }),
  })

  const locale = useLocale()
  const t = useTranslations("pages.newsletter.form")
  const actionError = useActionError()

  const form = useForm({
    defaultValues: { email: "" },
    onSubmit: async ({ value }): Promise<void> => {
      try {
        const { email } = value
        const result = await subscribeToNewsletterRequest.mutateAsync({ email, locale })
        form.reset()
        toast.success(t(result.status))
      } catch (error) {
        toast.error(actionError(error))
      }
    },
    validators: { onChange: emailSchema, onSubmit: emailSchema },
  })
  const isPending = useSelector(form.store, (state) => state.isSubmitting)

  return (
    <form
      className="mt-6"
      noValidate
      onSubmit={(event) => {
        event.preventDefault()
        event.stopPropagation()
        void form.handleSubmit()
      }}
    >
      <form.Field name="email">
        {(field) => (
          <NewsletterSubscriptionFields
            isPending={isPending}
            isReadOnly={false}
            message={fieldErrorMessage(field.state.meta.errors)}
            onBlur={field.handleBlur}
            onChange={field.handleChange}
            value={field.state.value}
          />
        )}
      </form.Field>
    </form>
  )
}
