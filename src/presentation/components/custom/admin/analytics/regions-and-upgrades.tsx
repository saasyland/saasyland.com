import type { JSX } from "react"

import { useLocale, useTranslations } from "use-intl/react"

import { ADMIN_ANALYTICS_REGION_ROWS, ADMIN_ANALYTICS_UPGRADE_ROWS } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

const CARD_CLASSNAME = "group relative overflow-hidden border-border transition-colors hover:border-border"

const VIEW_ALL_CLASSNAME = "h-auto p-0 text-xs font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"

export const RegionsAndUpgrades = (): JSX.Element => {
  const t = useTranslations("pages.admin.analytics")
  const regionNames = new Intl.DisplayNames(useLocale(), { type: "region" })

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card className={CARD_CLASSNAME}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-base font-medium text-foreground">{t("regions.title")}</h2>
          <Button variant="ghost" size="sm" className={VIEW_ALL_CLASSNAME}>
            {t("regions.viewAll")}
          </Button>
        </div>
        <CardContent className="space-y-5 p-5">
          {ADMIN_ANALYTICS_REGION_ROWS.map((region) => (
            <div key={region.code}>
              <div className="mb-2 flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 font-medium text-foreground">
                  {region.flag} {regionNames.of(region.code) ?? region.code}
                </span>
                <span className="text-muted-foreground">
                  {region.percentage}
                  <span aria-hidden="true">%</span>
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                <div className="h-full rounded-full bg-primary" style={{ width: `${String(region.percentage)}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={CARD_CLASSNAME}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="text-base font-medium text-foreground">{t("upgrades.title")}</h2>
          <Button variant="ghost" size="sm" className={VIEW_ALL_CLASSNAME}>
            {t("upgrades.viewAll")}
          </Button>
        </div>
        <div className="divide-y divide-border">
          {ADMIN_ANALYTICS_UPGRADE_ROWS.map((upgrade) => (
            <div className="flex items-center justify-between p-4 transition-colors hover:bg-muted/40" key={upgrade.id}>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex size-8 shrink-0 items-center justify-center rounded-full bg-linear-to-tr text-xs font-medium text-white",
                    upgrade.colors,
                  )}
                >
                  {upgrade.initials}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{upgrade.name}</p>
                  <p className="text-xs text-muted-foreground">{t(`demo.upgrades.${upgrade.id}.action`)}</p>
                </div>
              </div>
              <span className="text-xs text-muted-foreground">{t(`demo.upgrades.${upgrade.id}.time`)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
