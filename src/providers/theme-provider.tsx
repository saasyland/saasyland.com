import type { ComponentProps, JSX } from "react"

import { ClientThemeProvider as WrkszThemeProvider } from "@wrksz/themes/client/extended-provider"

import { THEME } from "~/src/presentation/theme"

// Wrap only its consumers, never a route <Outlet />: its post-hydration state change would force the page to hydrate in one task.
export const ThemeProvider = ({ children, ...props }: Readonly<ComponentProps<typeof WrkszThemeProvider>>): JSX.Element => (
  <WrkszThemeProvider
    storage="localStorage"
    storageKey={THEME.STORAGE_KEY}
    defaultTheme={THEME.DEFAULT_THEME}
    disableTransitionOnChange
    enableSameDocumentSync
    {...props}
  >
    {children}
  </WrkszThemeProvider>
)
