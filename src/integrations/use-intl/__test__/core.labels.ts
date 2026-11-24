import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { USER_STATUS } from "~/src/modules/user/user.constants"

import { FOOTER_SECTIONS } from "~/src/data/marketing"
import { ADMIN_NAVIGATION, FOOTER_NAVIGATION } from "~/src/data/navigation"

export const CORE_LABELS = [
  { keys: FOOTER_NAVIGATION.map(({ key }) => key), labels: "components.custom.footer.columns" },
  { keys: FOOTER_SECTIONS, labels: "components.custom.footer.links" },
  { keys: Object.values(ERROR_CODES), labels: "errors.codes" },
  { keys: Object.values(USER_STATUS), labels: "pages.admin.dashboard.users.table.status" },
  { keys: ADMIN_NAVIGATION.map(({ key }) => key), labels: "pages.admin.sidebar.groups" },
]
