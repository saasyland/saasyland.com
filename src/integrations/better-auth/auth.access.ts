import { type RoleAuthorizeRequest, createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

import { ROLE_CODES, isRole } from "~/src/integrations/better-auth/auth.roles"

export const APP_STATEMENTS = {
  admin: ["access"],
  category: ["create", "read", "update", "delete"],
  course: ["create", "read", "update", "delete"],
  order: ["read", "update", "refund"],
  product: ["create", "read", "update", "delete", "publish"],
  settings: ["manage"],
  video: ["read", "delete"],
} as const

export const ac = createAccessControl({ ...defaultStatements, ...APP_STATEMENTS })

export const ROLES = {
  [ROLE_CODES.ADMIN]: ac.newRole({ ...APP_STATEMENTS, ...adminAc.statements }),
  [ROLE_CODES.CUSTOMER]: ac.newRole({}),
}

export type Permission = RoleAuthorizeRequest<typeof ac.statements>

export const hasPermission = ({
  permission,
  role,
}: {
  readonly permission: Permission
  readonly role: string | null | undefined
}): boolean => isRole(role) && ROLES[role].authorize(permission).success
