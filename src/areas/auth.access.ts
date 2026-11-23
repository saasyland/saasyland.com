import { type AreaAccess, ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

const STATEMENTS = {
  admin: ["access"],
  settings: ["manage"],
} as const

export const AUTH_ACCESS = {
  grants: { [ROLE_CODES.ADMIN]: STATEMENTS },
  statements: STATEMENTS,
} as const satisfies AreaAccess
