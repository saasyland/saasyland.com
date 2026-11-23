import { type AreaAccess, ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

const STATEMENTS = {
  order: ["read", "update", "refund"],
} as const

export const PAYMENTS_ACCESS = {
  grants: { [ROLE_CODES.ADMIN]: STATEMENTS },
  statements: STATEMENTS,
} as const satisfies AreaAccess
