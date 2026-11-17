import { TIMEZONES } from "~/src/modules/_core/constants/timezone"

export const BAN_REASON_MAX_LENGTH = 255

export const TIMEZONE_CODES = [TIMEZONES[0].iana, ...TIMEZONES.slice(1).map((timezone) => timezone.iana)] as const

export const USER_STATUS = {
  ACTIVE: "active",
  BANNED: "banned",
  PENDING: "pending",
} as const

export const USER_QUERY_KEYS = {
  ALL: ["user"],
  DETAIL: ["user", "getUser"],
  LIST: ["user", "getUsers"],
} as const

export const USER_MUTATION_KEYS = {
  BAN: ["user", "banUser"],
  CREATE: ["user", "createUser"],
  DELETE: ["user", "deleteUser"],
  IMPERSONATE: ["user", "impersonateUser"],
  SET_PASSWORD: ["user", "setUserPassword"],
  SET_ROLE: ["user", "setUserRole"],
  STOP_IMPERSONATING: ["user", "stopImpersonatingUser"],
  UNBAN: ["user", "unbanUser"],
  UPDATE: ["user", "updateUser"],
  UPDATE_PREFERENCES: ["user", "updatePreferences"],
} as const
