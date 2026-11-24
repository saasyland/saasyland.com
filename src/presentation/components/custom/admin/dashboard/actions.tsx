import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { ADMIN_DASHBOARD_ACTIONS } from "~/src/data/navigation"

import { LinkButton } from "~/src/presentation/components/shadcn/button"

export const DashboardActions = (): JSX.Element => {
  const t = useTranslations()

  return (
    <>
      {ADMIN_DASHBOARD_ACTIONS.map((action) => (
        <LinkButton className="h-9 gap-2" to={action.to} key={action.to} size="sm" variant="outline">
          <action.icon aria-hidden className="size-4" />
          {t(action.label)}
        </LinkButton>
      ))}
    </>
  )
}
