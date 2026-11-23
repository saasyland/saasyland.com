import { haveIBeenPwned } from "better-auth/plugins/haveibeenpwned"

import { notifyPasswordChange } from "~/src/integrations/better-auth/auth.hooks"

import type { AuthPluginEntry } from "~/src/data/auth-plugins"

import { ROUTES } from "~/src/routes"

const NEW_PASSWORD_PATHS = [
  ROUTES.API_AUTH.ACCEPT_INVITATION,
  ROUTES.API_AUTH.ADMIN_CREATE_USER,
  ROUTES.API_AUTH.ADMIN_SET_USER_PASSWORD,
  ROUTES.API_AUTH.CHANGE_PASSWORD,
  ROUTES.API_AUTH.RESET_PASSWORD,
  ROUTES.API_AUTH.SET_PASSWORD,
  ROUTES.API_AUTH.SIGN_UP_EMAIL,
]

export const AUTH_AUTH_PLUGINS = [
  { plugin: haveIBeenPwned({ paths: NEW_PASSWORD_PATHS }), rateLimitExemptPaths: [] },
  {
    plugin: {
      hooks: { after: [{ handler: notifyPasswordChange, matcher: ({ path }) => path === ROUTES.API_AUTH.CHANGE_PASSWORD }] },
      id: "password-change-notice",
    },
    rateLimitExemptPaths: [],
  },
] as const satisfies readonly AuthPluginEntry[]
