import { TIMEZONES } from "~/src/data/timezones"

export const BAN_REASON_MAX_LENGTH = 255

export const TIMEZONE_CODES = [TIMEZONES[0].iana, ...TIMEZONES.slice(1).map((timezone) => timezone.iana)] as const

export const USER_STATUS = {
  ACTIVE: "active",
  BANNED: "banned",
  PENDING: "pending",
} as const

export const USER_STATUSES = [USER_STATUS.ACTIVE, USER_STATUS.PENDING, USER_STATUS.BANNED] as const

export const USER_SORT_COLUMNS = [
  "user",
  "role",
  "status",
  "emailVerified",
  "twoFactorEnabled",
  "timezone",
  "createdAt",
  "updatedAt",
] as const

export const USER_QUERY_KEYS = {
  ALL: ["user"],
  DETAIL: ["user", "getUser"],
  LIST: ["user", "getUsers"],
  SEARCH: ["user", "searchUsers"],
  SIGNUPS: ["user", "getUserSignups"],
} as const

export const USER_MUTATION_KEYS = {
  BAN: ["user", "banUser"],
  CONFIRM_ACCOUNT_DELETION: ["user", "confirmAccountDeletion"],
  CREATE: ["user", "createUser"],
  DELETE: ["user", "deleteUser"],
  IMPERSONATE: ["user", "impersonateUser"],
  REQUEST_ACCOUNT_DELETION: ["user", "requestAccountDeletion"],
  SET_PASSWORD: ["user", "setUserPassword"],
  SET_ROLE: ["user", "setUserRole"],
  STOP_IMPERSONATING: ["user", "stopImpersonatingUser"],
  UNBAN: ["user", "unbanUser"],
  UPDATE: ["user", "updateUser"],
  UPDATE_PREFERENCES: ["user", "updatePreferences"],
} as const
