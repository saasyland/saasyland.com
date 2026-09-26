import type { JSX, ReactNode } from "react"

import { ClientThemeProvider as WrkszThemeProvider } from "@wrksz/themes/client/extended-provider"

import { THEME, type ThemeSelection } from "~/src/presentation/theme"

import { getCookie } from "~/src/lib/cookie"

const THEME_VALUES: readonly string[] = THEME.THEMES

export const isThemeSelection = (value: unknown): value is ThemeSelection => typeof value === "string" && THEME_VALUES.includes(value)

export const getStoredTheme = (): ThemeSelection => {
  const stored = getCookie(THEME.COOKIE_NAME)

  return isThemeSelection(stored) ? stored : THEME.DEFAULT_THEME
}

export const ThemeProvider = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => (
  <WrkszThemeProvider
    defaultTheme={THEME.DEFAULT_THEME}
    disableTransitionOnChange
    enableSameDocumentSync
    initialTheme={getStoredTheme()}
    storage="cookie"
    storageKey={THEME.COOKIE_NAME}
  >
    {children}
  </WrkszThemeProvider>
)
