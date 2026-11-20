import type { ReactNode } from "react"

import { RootProvider } from "@fumadocs/base-ui/provider/tanstack"
import { getRequest } from "@tanstack/react-start/server"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, expect, it, vi } from "vite-plus/test"

import { createContentDirectory, mdx } from "~/src/platform/testing/lib/content-directory"
import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { DOCS_DIRECTORY, createContentIndexes } from "~/src/integrations/fumadocs/fumadocs.indexes"
import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { useFumadocsI18n } from "~/src/hooks/use-fumadocs-i18n"

import { DocsSearchDialog } from "~/src/presentation/components/custom/docs-search-dialog"

import englishFumadocs from "~/messages/en-US/fumadocs.json"
import polishFumadocs from "~/messages/pl-PL/fumadocs.json"

const { SEARCH_INDEXES } = vi.hoisted(() => ({
  SEARCH_INDEXES: { "en-US": "/assets/search-index-en-US-1.json", "pl-PL": "/assets/search-index-pl-PL-1.json" },
}))

vi.mock("virtual:docs-search", () => ({ SEARCH_INDEXES }))

const CONTENT = {
  [`${DOCS_DIRECTORY}/meta.en-US.json`]: JSON.stringify({ pages: ["install"], title: "Documentation" }),
  [`${DOCS_DIRECTORY}/meta.pl-PL.json`]: JSON.stringify({ pages: ["install"], title: "Dokumentacja" }),
  [`${DOCS_DIRECTORY}/install.en-US.mdx`]: mdx({ title: "Install" }, "## Clone\n\nClone the starter and install dependencies.\n"),
  [`${DOCS_DIRECTORY}/install.pl-PL.mdx`]: mdx({ title: "Instalacja" }, "## Klonowanie\n\nSklonuj starter i zainstaluj zależności.\n"),
}

class Observer {
  observe = vi.fn()
  unobserve = vi.fn()
  disconnect = vi.fn()
}

const FumadocsRoot = ({ children }: Readonly<{ children: ReactNode }>) => {
  const i18n = useFumadocsI18n()

  return (
    <RootProvider i18n={i18n} search={{ SearchDialog: DocsSearchDialog }} theme={{ enabled: false }}>
      {children}
    </RootProvider>
  )
}

const renderSearch = async (locale: SupportedLocale) => {
  const { search } = await createContentIndexes(createContentDirectory(CONTENT))
  const exported = await search(locale)
  const fetchIndex = vi.fn((_url: string) => Promise.resolve(Response.json(exported)))
  vi.stubGlobal("fetch", fetchIndex)
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000/${locale}/docs/install`))
  renderWithRouter(
    <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
      <FumadocsRoot>
        <p>Documentation content</p>
      </FumadocsRoot>
    </IntlProvider>,
    { router: createTestRouter(`/${locale}/docs/install`) },
  )

  return fetchIndex
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", Observer)
})

afterEach(() => {
  vi.unstubAllGlobals()
})

it("downloads the page locale's index only when someone searches, and lists the pages and passages it finds", async () => {
  const user = userEvent.setup()
  const fetchIndex = await renderSearch("en-US")

  await user.keyboard("{Control>}k{/Control}")
  const dialog = within(await screen.findByRole("dialog"))
  expect(fetchIndex).not.toHaveBeenCalled()

  await user.type(dialog.getByRole("combobox", { name: englishFumadocs.search.label }), "dependencies")

  expect(await dialog.findByRole("option", { name: /Install/u })).toBeInTheDocument()
  expect(dialog.getByRole("option", { name: /Clone the starter and install dependencies/u })).toBeInTheDocument()
  expect(fetchIndex).toHaveBeenCalledExactlyOnceWith(SEARCH_INDEXES["en-US"])
})

it("searches the Polish index on a Polish page", async () => {
  const user = userEvent.setup()
  const fetchIndex = await renderSearch("pl-PL")

  await user.keyboard("{Control>}k{/Control}")
  const dialog = within(await screen.findByRole("dialog"))
  await user.type(dialog.getByRole("combobox", { name: polishFumadocs.search.label }), "zależności")

  expect(await dialog.findByRole("option", { name: /Instalacja/u })).toBeInTheDocument()
  expect(fetchIndex).toHaveBeenCalledExactlyOnceWith(SEARCH_INDEXES["pl-PL"])
})
