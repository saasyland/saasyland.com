import type { ReactNode } from "react"

import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from "@tanstack/react-router"
import { ThemeScript } from "@wrksz/themes/script"

import { AriaProvider } from "~/src/providers/aria-provider"
import { ThemeProvider } from "~/src/providers/theme-provider"
import { TranslationsProvider } from "~/src/providers/translations-provider"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { ROOT_NAMESPACES, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { getLocaleDirection } from "~/src/modules/_core/constants/locale"

import { THEME } from "~/src/presentation/theme"

import { toOpenGraphLocale } from "~/src/lib/seo"

import { Toaster } from "~/src/presentation/components/shadcn/sonner"

import { OfflineBanner } from "~/src/presentation/components/custom/offline-banner"

import { DOCUMENT_STYLESHEET, fontPreloads } from "~/src/presentation/document-assets"
import type { RouterContext } from "~/src/router"

const RootComponent = () => (
  <AriaProvider>
    <OfflineBanner />
    <Outlet />
    <ThemeProvider>
      <Toaster />
    </ThemeProvider>
  </AriaProvider>
)

const RootDocument = ({ children }: Readonly<{ children: ReactNode }>) => {
  const locale = getCurrentLocale()

  return (
    <html
      lang={locale}
      dir={getLocaleDirection(locale)}
      className="h-full bg-background text-foreground antialiased"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <meta charSet="utf-8" />
        <ThemeScript defaultTheme={THEME.DEFAULT_THEME} storage="cookie" storageKey={THEME.COOKIE_NAME} />
        <HeadContent />
        {I18N.SUPPORTED_LOCALES.filter((supported) => supported !== locale).map((alternate) => (
          <meta content={toOpenGraphLocale(alternate)} key={alternate} property="og:locale:alternate" />
        ))}
      </head>
      <body className="flex min-h-full flex-col" suppressHydrationWarning>
        <TranslationsProvider>{children}</TranslationsProvider>
        <Scripts />
      </body>
    </html>
  )
}

export const Route = createRootRouteWithContext<RouterContext>()({
  beforeLoad: ({ context }) =>
    preloadNamespaces({ locale: getCurrentLocale(), namespaces: ROOT_NAMESPACES, queryClient: context.queryClient }),
  component: RootComponent,
  head: () => ({
    links: [DOCUMENT_STYLESHEET, ...fontPreloads(getCurrentLocale())],
    meta: [
      { content: "width=device-width, initial-scale=1", name: "viewport" },
      ...(import.meta.env.MODE === "production" ? [] : [{ content: "noindex, nofollow", name: "robots" }]),
    ],
  }),
  shellComponent: RootDocument,
})
