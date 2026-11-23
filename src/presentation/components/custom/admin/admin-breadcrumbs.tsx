import type { JSX } from "react"

import { Link, useRouterState } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { useNavigationLabel } from "~/src/hooks/use-navigation-label"

import { BROWSER_AREAS } from "~/src/areas/browser"
import { ADMIN_NAVIGATION } from "~/src/data/navigation"

import { cn } from "~/src/lib/cn"

import * as ROUTES from "~/src/routes"

const SIDEBAR_ITEMS = ADMIN_NAVIGATION.flatMap((group) => group.items)

const USER_TABS = BROWSER_AREAS.flatMap(({ name, userTabs = [] }) => userTabs.map((tab) => ({ ...tab, area: name })))

const LINK_CLASSNAME =
  "shrink-0 rounded-sm whitespace-nowrap transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const Divider = (): JSX.Element => (
  <span aria-hidden className="shrink-0 text-muted-foreground/40 select-none">
    /
  </span>
)

const CurrentPage = ({ label }: { readonly label: string }): JSX.Element => (
  <>
    <Divider />
    <span aria-current="page" className="min-w-0 truncate font-medium text-foreground" title={label}>
      {label}
    </span>
  </>
)

export const AdminBreadcrumbs = (): JSX.Element | undefined => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const t = useTranslations()
  const navigationLabel = useNavigationLabel()

  const [area, section, action] = pathname.split("/").filter(Boolean)

  if (area !== "admin") {
    return
  }

  const sectionUrl = section === undefined ? ROUTES.ADMIN : `${ROUTES.ADMIN}/${section}`
  const item = SIDEBAR_ITEMS.find((candidate) => candidate.to === sectionUrl)
  const tab = USER_TABS.find((candidate) => candidate.to === pathname)

  return (
    <nav
      aria-label={t("pages.admin.components.breadcrumbs.home")}
      className="hidden min-w-0 items-center gap-1.5 text-body-sm text-muted-foreground sm:flex"
    >
      <Link activeOptions={{ exact: true, includeSearch: false }} className={LINK_CLASSNAME} to={ROUTES.ADMIN}>
        {t("pages.admin.components.breadcrumbs.home")}
      </Link>
      {item && (
        <>
          <Divider />
          <Link
            activeOptions={{ exact: true, includeSearch: false }}
            className={cn(LINK_CLASSNAME, "data-[status=active]:font-medium data-[status=active]:text-foreground")}
            to={item.to}
          >
            {navigationLabel(item)}
          </Link>
        </>
      )}
      {tab && <CurrentPage label={t(`navigation.${tab.area}.userTabs.${tab.key}`)} />}
      {item && !tab && action !== undefined && t.has(`navigation.${item.area}.breadcrumbs.${action}`) && (
        <CurrentPage label={t(`navigation.${item.area}.breadcrumbs.${action}`)} />
      )}
    </nav>
  )
}
