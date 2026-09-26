import { renderToString } from "react-dom/server"

import { QueryClient } from "@tanstack/react-query"
import { fireEvent, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { TestProviders, createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { selectTriggerNamed } from "~/src/platform/testing/lib/select-trigger-name"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { getLocaleName } from "~/src/modules/_core/constants/locale"

import { LocaleSelect, LocaleSwitcher } from "~/src/presentation/components/custom/locale-switcher"

import localeSwitcherMessages from "~/messages/en-US/components.custom.locale-switcher.json"

const renderSwitcher = (path = "/") => {
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
      <LocaleSwitcher />
    </IntlProvider>,
    { router: createTestRouter(path) },
  )
  const trigger = screen.getByLabelText(localeSwitcherMessages.label)

  return { menu: screen.getByRole("group"), trigger, user: userEvent.setup() }
}

describe("locale switcher", () => {
  it("links every supported language to the current page and marks the active language", () => {
    const { menu, trigger } = renderSwitcher("/pricing")

    expect(trigger).toHaveTextContent(getLocaleName(I18N.DEFAULT_LOCALE))
    expect(menu).not.toHaveAttribute("open")
    for (const locale of I18N.SUPPORTED_LOCALES) {
      const link = within(menu).getByRole("link", { name: getLocaleName(locale) })
      expect(link).toHaveAttribute("hreflang", locale)
      expect(link).toHaveAttribute("lang", locale)
    }
    expect(within(menu).getByRole("link", { name: getLocaleName("en-US") })).toHaveAttribute("href", "/pricing")
    expect(within(menu).getByRole("link", { name: getLocaleName("pl-PL") })).toHaveAttribute("href", "/pl-PL/pricing")
    expect(within(menu).getByRole("link", { current: true })).toHaveAccessibleName(getLocaleName(I18N.DEFAULT_LOCALE))
    expect(within(menu).getAllByRole("link", { current: false })).toHaveLength(I18N.SUPPORTED_LOCALES.length - 1)
  })

  it("stays open while focus moves between the trigger and languages and closes once focus leaves", async () => {
    const { menu, trigger, user } = renderSwitcher()

    await user.click(trigger)
    expect(menu).toHaveAttribute("open")
    expect(trigger).toHaveFocus()

    await user.tab()
    expect(within(menu).getByRole("link", { name: getLocaleName(I18N.SUPPORTED_LOCALES[0]) })).toHaveFocus()
    expect(menu).toHaveAttribute("open")

    await user.tab({ shift: true })
    expect(trigger).toHaveFocus()
    expect(menu).toHaveAttribute("open")

    await user.tab({ shift: true })
    expect(trigger).not.toHaveFocus()
    expect(menu).not.toHaveAttribute("open")
  })

  it("closes on Escape and ignores other keys", async () => {
    const { menu, trigger, user } = renderSwitcher()

    await user.click(trigger)
    await user.keyboard("{ArrowDown}")
    expect(menu).toHaveAttribute("open")

    await user.keyboard("{Escape}")
    expect(menu).not.toHaveAttribute("open")
    expect(trigger).toHaveFocus()
  })
})

const renderSelect = (path: string) => {
  const assign = vi.fn<(url: string) => void>()
  vi.stubGlobal("location", { assign, hash: "", pathname: path, search: "" })
  renderWithRouter(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
      <LocaleSelect />
    </IntlProvider>,
    { router: createTestRouter(path) },
  )

  return { assign, user: userEvent.setup() }
}

describe("locale select", () => {
  afterEach(() => vi.unstubAllGlobals())

  it("shows the current language and opens the chosen language's version of the page", async () => {
    const { assign, user } = renderSelect("/docs/guides")

    const trigger = await screen.findByRole("button", { name: selectTriggerNamed(getLocaleName(I18N.DEFAULT_LOCALE)) })
    await user.click(trigger)
    await user.click(await screen.findByRole("option", { name: getLocaleName("pl-PL") }))

    expect(assign).toHaveBeenCalledWith("/pl-PL/docs/guides")
  })

  it("ignores an empty selection from the native select", async () => {
    const { assign } = renderSelect("/docs")
    await screen.findByRole("button", { name: selectTriggerNamed(getLocaleName(I18N.DEFAULT_LOCALE)) })

    fireEvent.change(screen.getByRole("combobox", { hidden: true }), { target: { value: "" } })

    expect(assign).not.toHaveBeenCalled()
  })

  it("renders the current language on the server before the options are collected", () => {
    const html = renderToString(
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
        <TestProviders queryClient={new QueryClient()} router={createTestRouter("/docs")}>
          <LocaleSelect />
        </TestProviders>
      </IntlProvider>,
    )

    expect(html).toContain(getLocaleName(I18N.DEFAULT_LOCALE))
  })
})
