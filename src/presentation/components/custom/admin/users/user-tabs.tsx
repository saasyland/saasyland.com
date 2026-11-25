import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { NavigationEntry } from "~/src/data/navigation.constants"

import { TabsLink, TabsList } from "~/src/presentation/components/shadcn/tabs"

import { ROUTES } from "~/src/routes"

export const USER_TABS: readonly NavigationEntry[] = [
  { label: "navigation.auth.userTabs.allUsers", to: ROUTES.ADMIN.USERS.ALL },
  { label: "navigation.payments.userTabs.customers", to: ROUTES.ADMIN.USERS.CUSTOMERS },
  { label: "navigation.team.userTabs.invitations", to: ROUTES.ADMIN.USERS.INVITATIONS },
]

export const UserTabs = (): JSX.Element => {
  const t = useTranslations()

  return (
    <TabsList className="no-scrollbar justify-start gap-6 overflow-x-auto" variant="line">
      {USER_TABS.map((tab) => (
        <TabsLink className="flex-none px-0 text-sm" href={tab.to} id={tab.to} key={tab.to}>
          {t(tab.label)}
        </TabsLink>
      ))}
    </TabsList>
  )
}
