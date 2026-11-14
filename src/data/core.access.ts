import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

import type { AreaAccess } from "~/src/data/access"

const STATEMENTS = {
  admin: ["access"],
  settings: ["manage"],
} as const

export const CORE_ACCESS = {
  grants: { [ROLE_CODES.ADMIN]: STATEMENTS },
  statements: STATEMENTS,
} as const satisfies AreaAccess
