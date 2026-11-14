import { type RoleAuthorizeRequest, createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

import { ROLE_CODES, isRole } from "~/src/integrations/better-auth/auth.roles"

import { APP_STATEMENTS, grantsOf } from "~/src/data/access"

export const ac = createAccessControl({ ...defaultStatements, ...APP_STATEMENTS })

export const ROLES = {
  [ROLE_CODES.ADMIN]: ac.newRole({ ...grantsOf(ROLE_CODES.ADMIN), ...adminAc.statements }),
  [ROLE_CODES.CUSTOMER]: ac.newRole(grantsOf(ROLE_CODES.CUSTOMER)),
}

export type Permission = RoleAuthorizeRequest<typeof ac.statements>

export const hasPermission = ({
  permission,
  role,
}: {
  readonly permission: Permission
  readonly role: string | null | undefined
}): boolean => isRole(role) && ROLES[role].authorize(permission).success
