import type { User } from "~/src/modules/user/user.types"

export const USER_STATUSES = ["active", "pending", "banned"] as const

const INITIALS_LENGTH = 2

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
