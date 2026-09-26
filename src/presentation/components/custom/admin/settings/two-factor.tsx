import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { TwoFactorDialog } from "~/src/presentation/components/custom/admin/settings/two-factor-dialog"

export const SettingsTwoFactor = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.twoFactor")

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border p-5">
        <CardTitle className="mb-1 text-base font-medium text-foreground">{t("title")}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">{t("app")}</p>
          <p className="mt-1 text-xs text-muted-foreground">{t("appDescription")}</p>
        </div>
        <TwoFactorDialog />
      </CardContent>
    </Card>
  )
}
