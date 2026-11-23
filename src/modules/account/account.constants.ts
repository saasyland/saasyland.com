export const ACCOUNT_QUERY_KEYS = {
  ALL: ["account"],
  LIST: ["account", "listAccounts"],
} as const

export const ACCOUNT_MUTATION_KEYS = {
  CHANGE_EMAIL: ["account", "changeEmail"],
  CHANGE_PASSWORD: ["account", "changePassword"],
  SET_PASSWORD: ["account", "setPassword"],
  SIGN_OUT: ["account", "signOutUser"],
  SIGN_UP_WITH_PASSWORD: ["account", "signUpWithPassword"],
  UNLINK: ["account", "unlinkAccount"],
  UPDATE_USER: ["account", "updateUser"],
} as const

export const ACCOUNT_EMAIL_PURPOSE = {
  CHANGE_EMAIL_CONFIRMATION: "change-email-confirmation",
  EXISTING_ACCOUNT: "existing-account",
  PASSWORD_CHANGED: "password-changed",
} as const
