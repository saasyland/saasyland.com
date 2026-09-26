import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { ADMIN_ANALYTICS_KPIS } from "~/src/data/admin"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

export const AnalyticsKpis = (): JSX.Element => {
  const t = useTranslations("pages.admin.analytics.kpi")

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
      {ADMIN_ANALYTICS_KPIS.map(({ icon: Icon, metric, trendIcon: TrendIcon }) => (
        <Card className="group relative overflow-hidden border-border transition-colors hover:border-border" key={metric}>
          <CardContent className="p-5">
            <div className="mb-4 flex items-start justify-between">
              <span className="text-sm font-medium text-muted-foreground">{t(`${metric}.title`)}</span>
              <div className="flex size-8 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground">
                <Icon className="size-4" />
              </div>
            </div>
            <h3 className="text-3xl font-semibold tracking-tight text-foreground">{t(`${metric}.value`)}</h3>
            <div className="mt-2 flex items-center gap-2">
              <Badge variant="outline" className="px-0 text-xs font-medium text-ring">
                <TrendIcon className="mr-1 size-3" /> {t(`${metric}.trend`)}
              </Badge>
              <span className="text-xs text-muted-foreground">{t(`${metric}.trendLabel`)}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
