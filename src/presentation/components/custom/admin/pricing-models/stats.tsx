import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { ADMIN_PRICING_STATS } from "~/src/data/admin"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

export const PricingModelStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.pricing-models.stats")

  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
      {ADMIN_PRICING_STATS.map(({ icon: Icon, id, value }) => (
        <Card key={id}>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg border border-border bg-muted/60 text-foreground">
              <Icon className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">{t(id)}</p>
              <p className="text-lg font-medium tracking-tight text-foreground">{value}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
