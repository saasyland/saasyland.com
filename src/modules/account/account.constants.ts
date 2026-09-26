export const ACCOUNT_MUTATION_KEYS = {
  CHANGE_EMAIL: ["account", "changeEmail"],
  CHANGE_PASSWORD: ["account", "changePassword"],
  SIGN_OUT: ["account", "signOutUser"],
  SIGN_UP_WITH_PASSWORD: ["account", "signUpWithPassword"],
  UPDATE_USER: ["account", "updateUser"],
} as const
