import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "use-intl/react"

import type { Subscription } from "~/src/modules/subscription/subscription.types"
import { currentSubscriptionsQuery } from "~/src/modules/subscription/use-cases/get-current-subscriptions"

import { SUBSCRIPTION_STATUS_BADGES } from "~/src/data/billing"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

const SubscriptionPeriod = ({
  subscription,
}: {
  readonly subscription: Pick<Subscription["current"], "cancelAtPeriodEnd" | "currentPeriodEnd" | "endedAt">
}): JSX.Element => {
  const t = useTranslations("pages.billing.subscriptions")

  if (subscription.endedAt !== null) {
    return <>{t("ended", { date: subscription.endedAt })}</>
  }

  if (subscription.cancelAtPeriodEnd) {
    return <>{t("ends", { date: subscription.currentPeriodEnd })}</>
  }

  return <>{t("renews", { date: subscription.currentPeriodEnd })}</>
}

export const BillingSubscriptions = (): JSX.Element | undefined => {
  const t = useTranslations("pages.billing.subscriptions")
  const format = useFormatter()

  const { subscriptions } = useSuspenseQuery(currentSubscriptionsQuery).data

  if (subscriptions.length === 0) {
    return
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="flex flex-col divide-y divide-border">
          {subscriptions.map((subscription) => (
            <li className="flex flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3 first:pt-0 last:pb-0" key={subscription.id}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium wrap-anywhere text-foreground">{subscription.productName}</span>
                <span className="text-spec text-muted-foreground">
                  <SubscriptionPeriod subscription={subscription} />
                </span>
              </span>
              <span className="flex flex-col items-end gap-1 text-sm font-medium text-foreground">
                <span className="tabular-nums">
                  {t(`price.${subscription.recurringInterval}`, {
                    count: subscription.recurringIntervalCount,
                    price: format.number(subscription.price.amount, { currency: subscription.price.currency, style: "currency" }),
                  })}
                </span>
                <Badge variant={SUBSCRIPTION_STATUS_BADGES[subscription.status]}>{t(`status.${subscription.status}`)}</Badge>
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
