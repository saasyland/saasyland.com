import { ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

import type { AreaAccess } from "~/src/data/access"

const STATEMENTS = {
  course: ["create", "read", "update", "delete"],
  video: ["read", "delete"],
} as const

export const COURSES_ACCESS = {
  grants: { [ROLE_CODES.ADMIN]: STATEMENTS },
  statements: STATEMENTS,
} as const satisfies AreaAccess
