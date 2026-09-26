import type { JSX } from "react"

import { Clock, TrendingDown } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { ADMIN_REFUND_TRENDING_STATS } from "~/src/data/admin"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

export const RefundStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.payments.stats")

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
      {ADMIN_REFUND_TRENDING_STATS.map(({ icon: Icon, id }) => (
        <Card key={id}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground">{t(`${id}.title`)}</CardTitle>
            <Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-headline-support text-foreground tabular-nums">{t(`${id}.value`)}</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ring">
              <TrendingDown className="size-3.5" />
              <span>{t(`${id}.trend`)}</span>
              <span className="ml-1 text-muted-foreground">{t("vsLastMonth")}</span>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-xs font-medium text-muted-foreground">{t("pending.title")}</CardTitle>
          <Clock className="size-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-headline-support text-foreground tabular-nums">{t("pending.value")}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span>{t("pending.subtitle")}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
