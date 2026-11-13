import { USER_STATUS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"

export const USER_STATUSES = [USER_STATUS.ACTIVE, USER_STATUS.PENDING, USER_STATUS.BANNED] as const

const INITIALS_LENGTH = 2

export type UserStatus = (typeof USER_STATUSES)[number]

export const getUserStatus = (row: Pick<User["select"], "banned" | "emailVerified">): UserStatus => {
  if (row.banned) {
    return USER_STATUS.BANNED
  }

  if (!row.emailVerified) {
    return USER_STATUS.PENDING
  }

  return USER_STATUS.ACTIVE
}

export const getUserInitials = (name: string): string => {
  const [first = "?", second] = name
    .trim()
    .split(/\s+/u)
    .filter((part) => part !== "")

  if (second === undefined) {
    return first.slice(0, INITIALS_LENGTH).toUpperCase()
  }

  return `${first.charAt(0)}${second.charAt(0)}`.toUpperCase()
}
