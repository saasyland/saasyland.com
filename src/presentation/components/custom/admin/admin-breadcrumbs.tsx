import type { JSX } from "react"

import { Link, useRouterState } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { ADMIN_SIDEBAR_GROUPS, type AdminSidebarItem } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { ROUTES } from "~/src/routes"

const SIDEBAR_ITEMS = ADMIN_SIDEBAR_GROUPS.flatMap<AdminSidebarItem>((group) => group.items)

const LINK_CLASSNAME =
  "truncate rounded-sm transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const Divider = (): JSX.Element => (
  <span aria-hidden className="text-muted-foreground/40 select-none">
    /
  </span>
)

export const AdminBreadcrumbs = (): JSX.Element | undefined => {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const t = useTranslations("pages.admin")

  const [area, section, action] = pathname.split("/").filter(Boolean)

  if (area !== "admin") {
    return undefined
  }

  const sectionUrl = section === undefined ? ROUTES.ADMIN : `${ROUTES.ADMIN}/${section}`
  const item = SIDEBAR_ITEMS.find((candidate) => candidate.url === sectionUrl)
  const actionKey = `components.breadcrumbs.actions.${action ?? ""}`

  return (
    <nav
      aria-label={t("components.breadcrumbs.home")}
      className="hidden min-w-0 items-center gap-1.5 text-body-sm text-muted-foreground sm:flex"
    >
      <Link activeOptions={{ exact: true, includeSearch: false }} className={LINK_CLASSNAME} to={ROUTES.ADMIN}>
        {t("components.breadcrumbs.home")}
      </Link>
      {item && (
        <>
          <Divider />
          <Link
            activeOptions={{ exact: true, includeSearch: false }}
            className={cn(LINK_CLASSNAME, "data-[status=active]:font-medium data-[status=active]:text-foreground")}
            to={item.url}
          >
            {t(`sidebar.links.${item.titleKey}`)}
          </Link>
        </>
      )}
      {item && t.has(actionKey) && (
        <>
          <Divider />
          <span aria-current="page" className="truncate font-medium text-foreground">
            {t(actionKey)}
          </span>
        </>
      )}
    </nav>
  )
}
