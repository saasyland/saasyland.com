import { APP_DOMAIN } from "~/src/presentation/branding"

const THEMES = ["light", "dark", "system"] as const

const DEFAULT_THEME = "system" satisfies (typeof THEMES)[number]

const COOKIE_NAME = `${APP_DOMAIN}_theme`

export type ThemeSelection = (typeof THEMES)[number]

export const THEME = {
  COOKIE_NAME,
  DEFAULT_THEME,
  THEMES,
} as const
