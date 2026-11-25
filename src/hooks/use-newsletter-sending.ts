import { useMutation, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { NEWSLETTER_ISSUE_QUERY_KEYS, NEWSLETTER_ISSUE_STATUS } from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import { sendNewsletterIssueMutation } from "~/src/modules/newsletter-issue/use-cases/send-newsletter-issue"

import { useErrorMessage } from "~/src/hooks/use-error-message"

export const useNewsletterSending = () => {
  const t = useTranslations("pages.admin.newsletter.issues")
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  return useMutation({
    ...sendNewsletterIssueMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: NEWSLETTER_ISSUE_QUERY_KEYS.ALL }),
    onSuccess: ({ sentCount, status }) => {
      if (status === NEWSLETTER_ISSUE_STATUS.SENT) {
        toast.success(t("feedback.sent", { count: sentCount }))
        return
      }
      toast.info(t("feedback.busy"))
    },
  })
}
