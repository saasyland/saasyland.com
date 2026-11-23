import { type AreaAccess, ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

const STATEMENTS = {
  category: ["create", "read", "update", "delete"],
  product: ["create", "read", "update", "delete", "publish"],
} as const

export const PRODUCTS_ACCESS = {
  grants: { [ROLE_CODES.ADMIN]: STATEMENTS },
  statements: STATEMENTS,
} as const satisfies AreaAccess
