import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { MotionProvider } from "~/src/providers/motion-provider"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CLI_CHOICES, CLI_EXTRAS, CLI_TEMPLATE_SUPPORT, PACKAGE_MANAGER, SCAFFOLD_TARGET } from "~/src/data/cli"

import { CliConfigurator } from "~/src/presentation/components/custom/landing-page/components/cli-configurator"

import english from "~/messages/en-US/pages.landing.json"

const { choices, coming } = english.cli

const INIT_YES_ANSWERS = [
  { label: choices.framework.label, option: choices.framework.options.tanstack },
  { label: choices.architecture.label, option: choices.architecture.options.monolith },
  { label: choices.deployment.label, option: choices.deployment.options.cloudflare },
  { label: choices.runtime.label, option: choices.runtime.options.node },
  { label: choices.database.label, option: choices.database.options.sqlite },
  { label: choices.provider.label, option: choices.provider.options.d1 },
  { label: choices.orm.label, option: choices.orm.options.drizzle },
  { label: choices.tenancy.label, option: choices.tenancy.options.single },
  { label: choices.auth.label, option: choices.auth.options["better-auth"] },
  { label: choices.email.label, option: choices.email.options.resend },
  { label: choices.billing.label, option: choices.billing.options.none },
  { label: choices.content.label, option: choices.content.options.mdx },
]

const COMING_OPTIONS = CLI_CHOICES.flatMap((choice) => {
  const supported: readonly string[] = CLI_TEMPLATE_SUPPORT.choices[choice.id]
  const names: Readonly<Record<string, string>> = choices[choice.id].options

  return choice.options.filter((option) => !supported.includes(option.id)).map((option) => ({ flag: option.flag, name: names[option.id] }))
})

const EXTRA_NAMES: Readonly<Record<string, string>> = choices.extras.options

const isComing = (description: string): boolean => description.startsWith(coming)

const renderConfigurator = (): UserEvent => {
  render(
    <IntlProvider locale={I18N.DEFAULT_LOCALE} messages={getTestMessages(I18N.DEFAULT_LOCALE)} timeZone="UTC">
      <MotionProvider>
        <CliConfigurator />
      </MotionProvider>
    </IntlProvider>,
  )

  return userEvent.setup({ delay: null })
}

const question = (label: string): HTMLElement => screen.getByRole("radiogroup", { name: label })

const answer = (label: string, option: string): HTMLElement => within(question(label)).getByRole("radio", { name: option })

const extra = (name: string): HTMLElement =>
  within(screen.getByRole("toolbar", { name: choices.extras.label })).getByRole("button", { name })

const command = (): string => screen.getByText(SCAFFOLD_TARGET, { exact: false }).closest("code")?.textContent ?? ""

afterEach(() => {
  cleanup()
})

describe("CLI configurator", () => {
  it("opens on the answers init --yes resolves from what the templates generate, and its command holds only those", () => {
    renderConfigurator()

    for (const choice of CLI_CHOICES) {
      expect(within(question(choices[choice.id].label)).getAllByRole("radio")).toHaveLength(choice.options.length)
    }
    for (const { label, option } of INIT_YES_ANSWERS) {
      expect(answer(label, option)).toBeChecked()
      expect(answer(label, option)).toBeEnabled()
      expect(answer(label, option)).not.toHaveAccessibleDescription()
    }
    expect(within(question(choices.api.label)).queryByRole("radio", { checked: true })).not.toBeInTheDocument()
    expect(command()).toContain("--no-billing")
    for (const { flag } of COMING_OPTIONS) {
      expect(command()).not.toContain(flag)
    }
    for (const { flag } of CLI_EXTRAS) {
      expect(command()).not.toContain(flag)
    }
  })

  it("keeps every option the templates do not generate yet in its place, disabled, with the reason beside the options", () => {
    renderConfigurator()

    const comingOptions = screen.getAllByRole("radio", { description: isComing })
    expect(comingOptions.map((option) => option.textContent)).toStrictEqual(COMING_OPTIONS.map(({ name }) => name))
    for (const option of comingOptions) {
      expect(option).toBeDisabled()
      expect(option).not.toBeChecked()
    }
    const comingExtras = screen.getAllByRole("button", { description: isComing })
    expect(comingExtras.map((option) => option.textContent)).toStrictEqual(CLI_EXTRAS.map(({ id }) => EXTRA_NAMES[id]))
    for (const option of comingExtras) {
      expect(option).toBeDisabled()
      expect(option).toHaveAttribute("aria-pressed", "false")
    }
    expect(extra(choices.extras.options["page-builder"])).toHaveAccessibleDescription(coming)
    expect(answer(choices.framework.label, choices.framework.options.next)).toHaveAccessibleDescription(coming)
    expect(screen.getByText(coming)).toBeVisible()
  })

  it("gives an option that is coming and that another answer rules out both reasons", () => {
    renderConfigurator()

    expect(answer(choices.runtime.label, choices.runtime.options.bun)).toHaveAccessibleDescription(`${coming} ${choices.runtime.note}`)
    for (const option of within(question(choices.api.label)).getAllByRole("radio")) {
      expect(option).toBeDisabled()
      expect(option).toHaveAccessibleDescription(`${coming} ${choices.api.note}`)
    }
    expect(screen.getByText(choices.api.note)).toBeVisible()
    expect(command()).not.toContain("--api")
  })

  it("ignores a press on an option the templates do not generate yet", async () => {
    const user = renderConfigurator()
    const before = command()

    await user.click(answer(choices.framework.label, choices.framework.options.next))
    await user.click(answer(choices.billing.label, choices.billing.options.polar))
    await user.click(extra(choices.extras.options.commerce))

    expect(answer(choices.framework.label, choices.framework.options.tanstack)).toBeChecked()
    expect(answer(choices.billing.label, choices.billing.options.none)).toBeChecked()
    expect(extra(choices.extras.options.commerce)).toHaveAttribute("aria-pressed", "false")
    expect(command()).toBe(before)
  })

  it("answers a question the templates cover with either option and rewrites the command", async () => {
    const user = renderConfigurator()

    await user.click(answer(choices.auth.label, choices.auth.options.none))
    expect(answer(choices.auth.label, choices.auth.options.none)).toBeChecked()
    expect(command()).toContain("--no-auth")
    expect(command()).not.toContain("--auth better-auth")

    await user.click(answer(choices.auth.label, choices.auth.options["better-auth"]))
    await user.click(answer(choices.auth.label, choices.auth.options["better-auth"]))
    expect(answer(choices.auth.label, choices.auth.options["better-auth"])).toBeChecked()
    expect(command()).toContain("--auth better-auth")
  })

  it("moves the arrow keys only between options the templates generate, and leaves the question with Tab", async () => {
    const user = renderConfigurator()

    await user.click(answer(choices.framework.label, choices.framework.options.tanstack))
    await user.keyboard("{ArrowRight}")
    expect(answer(choices.framework.label, choices.framework.options.tanstack)).toHaveFocus()
    await user.keyboard(" ")
    expect(answer(choices.framework.label, choices.framework.options.tanstack)).toBeChecked()
    expect(command()).toContain("--framework tanstack")

    await user.click(answer(choices.auth.label, choices.auth.options["better-auth"]))
    await user.keyboard("{ArrowRight}")
    expect(answer(choices.auth.label, choices.auth.options.none)).toHaveFocus()
    await user.keyboard(" ")
    expect(answer(choices.auth.label, choices.auth.options.none)).toBeChecked()
    expect(command()).toContain("--no-auth")

    await user.keyboard("{ArrowLeft}{Enter}")
    expect(answer(choices.auth.label, choices.auth.options["better-auth"])).toBeChecked()

    await user.tab()
    expect(answer(choices.email.label, choices.email.options.resend)).toHaveFocus()
  })

  it("copies the selected runner with matching development instructions", async () => {
    const user = renderConfigurator()

    await user.click(screen.getByRole("radio", { name: PACKAGE_MANAGER.PNPM.id }))
    await user.click(screen.getByRole("button", { name: english.cli.copy }))
    const copied = await navigator.clipboard.readText()
    expect(copied).toContain(`${PACKAGE_MANAGER.PNPM.exec} ${SCAFFOLD_TARGET}`)
    expect(copied).toContain("--no-billing")
    expect(copied).not.toContain("--with")
    expect(screen.getByText(PACKAGE_MANAGER.PNPM.dev)).toBeVisible()
  })
})
