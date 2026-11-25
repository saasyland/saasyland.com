import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { NavigationEntry } from "~/src/data/navigation.constants"

import { TabsLink, TabsList } from "~/src/presentation/components/shadcn/tabs"

import { ROUTES } from "~/src/routes"

export const NEWSLETTER_TABS: readonly NavigationEntry[] = [
  { label: "navigation.newsletter.tabs.subscribers", to: ROUTES.ADMIN.NEWSLETTER.INDEX },
  { label: "navigation.newsletter.tabs.issues", to: ROUTES.ADMIN.NEWSLETTER.ISSUES },
]

export const NewsletterTabs = (): JSX.Element => {
  const t = useTranslations()

  return (
    <TabsList className="no-scrollbar justify-start gap-6 overflow-x-auto" variant="line">
      {NEWSLETTER_TABS.map((tab) => (
        <TabsLink className="flex-none px-0 text-sm" href={tab.to} id={tab.to} key={tab.to}>
          {t(tab.label)}
        </TabsLink>
      ))}
    </TabsList>
  )
}
