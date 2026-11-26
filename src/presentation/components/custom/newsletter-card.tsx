import { type JSX, useId } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { NEWSLETTER_SUBSCRIBER_QUERY_KEYS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { getNewsletterSubscriptionQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscription"
import { setNewsletterSubscriptionMutation } from "~/src/modules/newsletter-subscriber/use-cases/set-newsletter-subscription"

import { useEmailVerification } from "~/src/hooks/use-email-verification"
import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Switch } from "~/src/presentation/components/shadcn/switch"

export const NewsletterCard = (): JSX.Element => {
  const t = useTranslations("components.custom.newsletter-card")
  const descriptionId = useId()
  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const { confirmed } = useEmailVerification()
  const { isSubscribed } = useSuspenseQuery(getNewsletterSubscriptionQuery).data

  const setSubscription = useMutation({
    ...setNewsletterSubscriptionMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async (result) => {
      await queryClient.invalidateQueries({ queryKey: NEWSLETTER_SUBSCRIBER_QUERY_KEYS.SUBSCRIPTION })
      toast.success(result.isSubscribed ? t("subscribed") : t("unsubscribed"))
    },
  })

  const canSubscribe = confirmed || isSubscribed

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <Switch
          aria-describedby={descriptionId}
          isDisabled={setSubscription.isPending || !canSubscribe}
          isSelected={setSubscription.isPending ? setSubscription.variables.isSubscribed : isSubscribed}
          onChange={(selected) => {
            setSubscription.mutate({ isSubscribed: selected, locale: getCurrentLocale() })
          }}
        >
          <span className="text-sm font-medium text-foreground">{t("label")}</span>
        </Switch>
        <p className="text-sm text-pretty text-muted-foreground" id={descriptionId}>
          {canSubscribe ? t("delivery") : t("unconfirmed")}
        </p>
      </CardContent>
    </Card>
  )
}
