import type { JSX } from "react"

import { Calendar } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { useNavigationLabel } from "~/src/hooks/use-navigation-label"

import { ADMIN_DASHBOARD_ACTIONS } from "~/src/data/navigation"

import { Button, LinkButton } from "~/src/presentation/components/shadcn/button"

export const DashboardActions = (): JSX.Element => {
  const t = useTranslations("pages.admin.dashboard.actions")
  const navigationLabel = useNavigationLabel()

  return (
    <div className="flex items-center gap-3">
      <Button variant="outline" className="h-9 gap-2" isDisabled>
        <Calendar className="size-4 text-muted-foreground" />
        {t("last30Days")}
      </Button>
      {ADMIN_DASHBOARD_ACTIONS.map((action) => (
        <LinkButton className="h-9 gap-2 shadow-sm" href={action.to} key={action.key}>
          <action.icon aria-hidden className="size-4" />
          {navigationLabel(action)}
        </LinkButton>
      ))}
    </div>
  )
}
