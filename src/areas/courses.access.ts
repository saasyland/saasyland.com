import { type AreaAccess, ROLE_CODES } from "~/src/integrations/better-auth/auth.roles"

const STATEMENTS = {
  course: ["create", "read", "update", "delete"],
  video: ["read", "delete"],
} as const

export const COURSES_ACCESS = {
  grants: { [ROLE_CODES.ADMIN]: STATEMENTS },
  statements: STATEMENTS,
} as const satisfies AreaAccess
