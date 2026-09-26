export const SESSION_QUERY_KEYS = {
  ACTIVE: ["session", "getActiveSessions"],
  ALL: ["session"],
  CURRENT: ["session", "getCurrentSession"],
  USER: ["session", "listUserSessions"],
} as const

export const SESSION_MUTATION_KEYS = {
  REVOKE: ["session", "revokeSession"],
  REVOKE_OTHER: ["session", "revokeOtherSessions"],
  REVOKE_USER: ["session", "revokeUserSession"],
  REVOKE_USER_SESSIONS: ["session", "revokeUserSessions"],
} as const
