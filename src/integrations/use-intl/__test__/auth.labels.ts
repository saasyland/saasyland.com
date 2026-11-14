import { ROLE_VALUES } from "~/src/integrations/better-auth/auth.access"
import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"

import { USER_STATUS } from "~/src/modules/user/user.constants"

export const AUTH_LABELS = [
  { keys: Object.values(AUTH_ERRORS), labels: "auth.errors" },
  { keys: ROLE_VALUES, labels: "pages.admin.users.filters.role.options" },
  { keys: Object.values(USER_STATUS), labels: "pages.admin.users.filters.status.options" },
]
