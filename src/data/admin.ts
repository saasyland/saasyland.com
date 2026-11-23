import { USER_STATUS } from "~/src/modules/user/user.constants"
import type { UserStatus } from "~/src/modules/user/user.utils"

import type { BadgeVariant } from "~/src/presentation/components/shadcn/badge"

export const USER_STATUS_BADGES: Record<UserStatus, BadgeVariant> = {
  [USER_STATUS.ACTIVE]: "accent",
  [USER_STATUS.BANNED]: "destructive",
  [USER_STATUS.PENDING]: "warning",
}

export const ADMIN_DASHBOARD_PREVIEW_PAGINATION = { pageIndex: 0, pageSize: 5 } as const

export const ADMIN_USER_DETAILS = ["role", "status", "emailVerified", "twoFactorEnabled", "timezone", "createdAt", "updatedAt"] as const

export const USER_COLUMN_SIZES = {
  createdAt: 200,
  emailVerified: 176,
  role: 136,
  status: 136,
  timezone: 208,
  twoFactorEnabled: 136,
  updatedAt: 200,
  user: 280,
} as const

export const INVITATION_COLUMN_SIZES = {
  date: 152,
  email: 264,
  invitedBy: 192,
  role: 128,
  status: 144,
} as const
