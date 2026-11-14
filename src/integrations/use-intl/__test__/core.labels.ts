import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { USER_STATUS } from "~/src/modules/user/user.constants"

import { ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"
import { FOOTER_SECTIONS, NAVIGATION_SECTIONS } from "~/src/data/marketing"
import { ADMIN_DASHBOARD_ACTIONS, ADMIN_NAVIGATION, APP_NAVIGATION, FOOTER_NAVIGATION, NAVIGATION_PAGES } from "~/src/data/navigation"

export const CORE_LABELS = [
  { keys: FOOTER_NAVIGATION.map(({ key }) => key), labels: "components.custom.footer.columns" },
  {
    keys: [...FOOTER_SECTIONS, ...FOOTER_NAVIGATION.flatMap(({ links }) => links.map(({ key }) => key))],
    labels: "components.custom.footer.links",
  },
  { keys: [...NAVIGATION_SECTIONS, ...NAVIGATION_PAGES.map(({ key }) => key)], labels: "components.custom.navigation.items" },
  { keys: Object.values(ERROR_CODES), labels: "errors.codes" },
  { keys: ADMIN_DASHBOARD_ACTIONS.map(({ key }) => key), labels: "pages.admin.dashboard.actions" },
  { keys: ADMIN_DASHBOARD_STATS.map(({ key }) => `${key}.title`), labels: "pages.admin.dashboard.stats" },
  { keys: Object.values(USER_STATUS), labels: "pages.admin.dashboard.users.table.status" },
  { keys: ADMIN_NAVIGATION.map(({ key }) => key), labels: "pages.admin.sidebar.groups" },
  { keys: ADMIN_NAVIGATION.flatMap(({ items }) => items.map(({ key }) => key)), labels: "pages.admin.sidebar.links" },
  { keys: APP_NAVIGATION.map(({ key }) => key), labels: "pages.app.sidebar.navigation" },
]
