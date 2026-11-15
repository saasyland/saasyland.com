import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { USER_STATUS } from "~/src/modules/user/user.constants"

import { ADMIN_DASHBOARD_STATS } from "~/src/data/dashboard"
import { FOOTER_SECTIONS, NAVIGATION_SECTIONS } from "~/src/data/marketing"
import { ADMIN_DASHBOARD_ACTIONS, ADMIN_NAVIGATION, APP_NAVIGATION, FOOTER_NAVIGATION, NAVIGATION_PAGES } from "~/src/data/navigation"

const ENTRIES = [
  ...ADMIN_NAVIGATION.flatMap(({ items }) => items),
  ...ADMIN_DASHBOARD_ACTIONS,
  ...APP_NAVIGATION,
  ...FOOTER_NAVIGATION.flatMap(({ links }) => links),
  ...NAVIGATION_PAGES,
]

export const CORE_LABELS = [
  { keys: FOOTER_NAVIGATION.map(({ key }) => key), labels: "components.custom.footer.columns" },
  { keys: FOOTER_SECTIONS, labels: "components.custom.footer.links" },
  { keys: NAVIGATION_SECTIONS, labels: "components.custom.navigation.items" },
  { keys: ADMIN_DASHBOARD_STATS.map(({ area, key }) => `${area}.${key}`), labels: "dashboard" },
  { keys: Object.values(ERROR_CODES), labels: "errors.codes" },
  { keys: ENTRIES.map(({ area, key, placement }) => `${area}.${placement}.${key}`), labels: "navigation" },
  { keys: Object.values(USER_STATUS), labels: "pages.admin.dashboard.users.table.status" },
  { keys: ADMIN_NAVIGATION.map(({ key }) => key), labels: "pages.admin.sidebar.groups" },
]
