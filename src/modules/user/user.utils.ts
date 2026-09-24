import type { User } from "~/src/modules/user/user.types"

export const USER_STATUSES = ["active", "pending", "banned"] as const

export type UserStatus = (typeof USER_STATUSES)[number]

export const getUserStatus = (row: Pick<User["select"], "banned" | "emailVerified">): UserStatus => {
  if (row.banned) {
    return "banned"
  }

  if (!row.emailVerified) {
    return "pending"
  }

  return "active"
}
