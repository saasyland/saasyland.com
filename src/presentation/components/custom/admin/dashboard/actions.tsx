import type { JSX } from "react"

import { useNavigationLabel } from "~/src/hooks/use-navigation-label"

import { ADMIN_DASHBOARD_ACTIONS } from "~/src/data/navigation"

import { LinkButton } from "~/src/presentation/components/shadcn/button"

export const DashboardActions = (): JSX.Element => {
  const navigationLabel = useNavigationLabel()

  return (
    <div className="flex items-center gap-3">
      {ADMIN_DASHBOARD_ACTIONS.map((action) => (
        <LinkButton className="h-9 gap-2 shadow-sm" href={action.to} key={action.key}>
          <action.icon aria-hidden className="size-4" />
          {navigationLabel(action)}
        </LinkButton>
      ))}
    </div>
  )
}
