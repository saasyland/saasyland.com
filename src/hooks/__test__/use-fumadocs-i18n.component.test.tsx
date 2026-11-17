import type { ReactNode } from "react"

import { uiTranslations } from "@fumadocs/base-ui/i18n"
import { getRequest } from "@tanstack/react-start/server"
import { renderHook } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { useFumadocsI18n } from "~/src/hooks/use-fumadocs-i18n"

import fumadocsMessages from "~/messages/pl-PL/fumadocs.json"
import { ROUTES } from "~/src/routes"

const POLISH = "pl-PL"

const renderI18n = (locale: SupportedLocale) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${localizePathname({ locale, pathname: ROUTES.DOCS })}`))
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <IntlProvider locale={locale} messages={getTestMessages(locale)}>
      {children}
    </IntlProvider>
  )

  return renderHook(() => useFumadocsI18n(), { wrapper }).result.current
}

it("gives Fumadocs the page locale and the project's own message for each of its strings", () => {
  const { locale, translations = {} } = renderI18n(POLISH)

  expect(locale).toBe(POLISH)
  expect(translations).toMatchObject({
    "Copy Text(code block)(aria-label)": fumadocsMessages.copy.code,
    "On this page(table of contents)": fumadocsMessages.tableOfContents,
    "Open Sidebar(sidebar)(aria-label)": fumadocsMessages.sidebar.open,
    "Search failed, showing results for {query}(search dialog)": fumadocsMessages.search.failedWithResults,
    "Search(search trigger)": fumadocsMessages.search.label,
  })
  expect(uiTranslations().keys).toEqual(expect.arrayContaining(Object.keys(translations)))
})

it.each(I18N.SUPPORTED_LOCALES)("finds a %s message for every Fumadocs string the site renders", (locale) => {
  const { translations = {} } = renderI18n(locale)

  expect(Object.values(translations).every((text) => text !== undefined && text.trim().length > 0)).toBe(true)
})
