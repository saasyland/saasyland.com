import type { JSX, ReactNode } from "react"

import { createIsomorphicFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { ClientThemeProvider as WrkszThemeProvider } from "@wrksz/themes/client/extended-provider"

import { THEME, type ThemeSelection } from "~/src/presentation/theme"

import { readCookie } from "~/src/lib/cookie"

const THEME_VALUES: readonly string[] = THEME.THEMES

export const isThemeSelection = (value: unknown): value is ThemeSelection => typeof value === "string" && THEME_VALUES.includes(value)

const readThemeCookie = createIsomorphicFn()
  .server(() => readCookie({ header: getRequest().headers.get("cookie"), name: THEME.COOKIE_NAME }))
  .client(() => readCookie({ header: globalThis.document.cookie, name: THEME.COOKIE_NAME }))

export const getStoredTheme = (): ThemeSelection => {
  const stored = readThemeCookie()

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
