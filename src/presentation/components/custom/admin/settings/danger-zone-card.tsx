import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

export const DangerZoneCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.dangerZone")

  return (
    <Card className="overflow-hidden border-destructive/20 bg-destructive/5">
      <CardHeader className="border-b border-destructive/10 p-5">
        <CardTitle className="mb-1 text-base font-medium text-destructive">{t("title")}</CardTitle>
        <CardDescription className="text-xs text-destructive/80">{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="mb-1 text-sm font-medium text-foreground">{t("delete.title")}</p>
          <p className="text-xs text-muted-foreground">{t("delete.description")}</p>
        </div>
        <Button variant="destructive" className="shrink-0">
          {t("delete.button")}
        </Button>
      </CardContent>
    </Card>
  )
}
