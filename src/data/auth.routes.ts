export const ACCEPT_INVITATION = "/auth/invite"
export const ADMIN = "/admin"
export const ADMIN_SETTINGS = "/admin/settings"
export const ADMIN_USERS = "/admin/users"
export const ADMIN_USERS_ALL = "/admin/users/all"
export const ADMIN_USERS_INVITATIONS = "/admin/users/invitations"
export const API_AUTH = {
  ACCEPT_INVITATION: "/invitation/accept",
  ADMIN_CREATE_USER: "/admin/create-user",
  ADMIN_SET_USER_PASSWORD: "/admin/set-user-password",
  ADMIN_UPDATE_USER: "/admin/update-user",
  CALLBACK: "/callback",
  CHANGE_EMAIL: "/change-email",
  CHANGE_PASSWORD: "/change-password",
  GET_SESSION: "/get-session",
  REQUEST_PASSWORD_RESET: "/request-password-reset",
  RESET_PASSWORD: "/reset-password",
  SEND_VERIFICATION_EMAIL: "/send-verification-email",
  SET_PASSWORD: "/set-password",
  SIGN_IN_EMAIL: "/sign-in/email",
  SIGN_IN_SOCIAL: "/sign-in/social",
  SIGN_OUT: "/sign-out",
  SIGN_UP_EMAIL: "/sign-up/email",
  TWO_FACTOR: "/two-factor/*",
  UPDATE_USER: "/update-user",
} as const
export const API_AUTH_BASE = "/api/auth"
export const API_AUTH_VERIFY_EMAIL = `${API_AUTH_BASE}/verify-email`
export const APP = "/app"
export const APP_DELETE_ACCOUNT = "/app/settings/delete-account"
export const APP_SETTINGS = "/app/settings"
export const AUTH = "/auth"
export const AUTH_CALLBACK = "/auth/callback"
export const FORGOT_PASSWORD = "/auth/forgot-password"
export const RESET_PASSWORD = "/auth/reset-password"
export const SIGN_IN = "/auth/sign-in"
export const SIGN_UP = "/auth/sign-up"
export const TWO_FACTOR = "/auth/two-factor"
export const VERIFY_EMAIL = "/auth/verify-email"

export const AUTH_UNLISTED_ROUTES = [ADMIN, APP, AUTH] as const
