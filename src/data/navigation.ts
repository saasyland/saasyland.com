import { ADMIN_NAVIGATION_GROUPS, FOOTER_COLUMNS, NAVIGATION_PLACEMENT } from "~/src/data/navigation.constants"
import * as AREA_NAVIGATION from "~/src/data/navigation.entries"

const ENTRIES = Object.values(AREA_NAVIGATION)
  .flat()
  .toSorted((first, second) => first.order - second.order)

const ADMIN_ENTRIES = ENTRIES.filter((entry) => entry.placement === NAVIGATION_PLACEMENT.ADMIN)

const FOOTER_ENTRIES = ENTRIES.filter((entry) => entry.placement === NAVIGATION_PLACEMENT.FOOTER)

export const ADMIN_NAVIGATION = ADMIN_NAVIGATION_GROUPS.map((group) => ({
  items: ADMIN_ENTRIES.filter((entry) => entry.group === group),
  key: group,
})).filter(({ items }) => items.length > 0)

export const ADMIN_DASHBOARD_ACTIONS = ENTRIES.filter((entry) => entry.placement === NAVIGATION_PLACEMENT.DASHBOARD)

export const APP_NAVIGATION = ENTRIES.filter((entry) => entry.placement === NAVIGATION_PLACEMENT.APP)

export const NAVIGATION_PAGES = ENTRIES.filter((entry) => entry.placement === NAVIGATION_PLACEMENT.HEADER)

export const FOOTER_NAVIGATION = FOOTER_COLUMNS.map((column) => ({
  key: column,
  links: FOOTER_ENTRIES.filter((entry) => entry.column === column),
})).filter(({ links }) => links.length > 0)
