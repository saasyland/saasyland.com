import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { IntlProvider, createTranslator } from "use-intl"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { MotionProvider } from "~/src/providers/motion-provider"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CLI_CHOICES, CLI_EXTRAS, CLI_GENERATION_VALUES, PACKAGE_MANAGER, SCAFFOLD_TARGET } from "~/src/data/cli"

import { CliConfigurator } from "~/src/presentation/components/custom/landing-page/components/cli-configurator"

import english from "~/messages/en-US/pages.landing.json"

const { choices } = english.cli

const LEGEND = createTranslator({
  locale: I18N.DEFAULT_LOCALE,
  messages: { legend: english.cli.defaultStack.replace("<mark></mark> ", "") },
})("legend", CLI_GENERATION_VALUES)

const OPTION_COUNT = CLI_CHOICES.reduce((count, choice) => count + choice.options.length, 0)

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

const optionCount = (): number => screen.getAllByRole("radio").filter((radio) => radio.closest("dl")).length

const command = (): string => screen.getByText(SCAFFOLD_TARGET, { exact: false }).closest("code")?.textContent ?? ""

afterEach(() => {
  cleanup()
})

describe("CLI configurator", () => {
  it("asks each question as one radio group and opens on the default stack", () => {
    renderConfigurator()

    for (const choice of CLI_CHOICES) {
      const { label } = choices[choice.id]
      expect(within(question(label)).getAllByRole("radio")).toHaveLength(choice.options.length)
    }
    for (const { label, option } of [
      { label: choices.framework.label, option: choices.framework.options.tanstack },
      { label: choices.deployment.label, option: choices.deployment.options.cloudflare },
      { label: choices.provider.label, option: choices.provider.options.d1 },
    ]) {
      expect(answer(label, option)).toBeChecked()
      expect(answer(label, option)).toHaveAccessibleDescription(LEGEND)
    }
    expect(answer(choices.auth.label, choices.auth.options.none)).toHaveAccessibleDescription(LEGEND)
    expect(answer(choices.email.label, choices.email.options.none)).not.toHaveAccessibleDescription()
    expect(answer(choices.framework.label, choices.framework.options.next)).not.toHaveAccessibleDescription()

    const extras = screen.getByRole("toolbar", { name: choices.extras.label })
    expect(within(extras).getAllByRole("button")).toHaveLength(CLI_EXTRAS.length)
    expect(within(extras).getByRole("button", { name: choices.extras.options.commerce })).toHaveAttribute("aria-pressed", "false")
    expect(within(extras).getByRole("button", { name: choices.extras.options.commerce })).not.toHaveAccessibleDescription()
  })

  it("keeps every option in place, disabled with the reason its question gives, when other answers rule it out", async () => {
    const user = renderConfigurator()
    expect(optionCount()).toBe(OPTION_COUNT)

    for (const option of within(question(choices.api.label)).getAllByRole("radio")) {
      expect(option).toBeDisabled()
      expect(option).not.toBeChecked()
      expect(option).toHaveAccessibleDescription(choices.api.note)
    }
    expect(answer(choices.runtime.label, choices.runtime.options.bun)).toHaveAccessibleDescription(choices.runtime.note)
    expect(answer(choices.provider.label, choices.provider.options.neon)).toHaveAccessibleDescription(choices.provider.note)
    expect(screen.getByText(choices.api.note)).toBeVisible()
    expect(command()).not.toContain("--api")

    await user.click(answer(choices.deployment.label, choices.deployment.options.vercel))
    expect(answer(choices.database.label, choices.database.options.sqlite)).toBeDisabled()
    expect(answer(choices.database.label, choices.database.options.sqlite)).toHaveAccessibleDescription(
      `${LEGEND} ${choices.database.note}`,
    )
    expect(answer(choices.database.label, choices.database.options.postgres)).toBeChecked()
    expect(answer(choices.provider.label, choices.provider.options.d1)).toBeDisabled()
    expect(answer(choices.provider.label, choices.provider.options.neon)).toBeChecked()
    expect(answer(choices.provider.label, choices.provider.options.neon)).not.toHaveAccessibleDescription()
    expect(optionCount()).toBe(OPTION_COUNT)
  })

  it("reconciles the API, runtime and database answers when the architecture and deployment change", async () => {
    const user = renderConfigurator()

    await user.click(answer(choices.architecture.label, choices.architecture.options.split))
    expect(answer(choices.api.label, choices.api.options.hono)).toBeChecked()
    expect(answer(choices.api.label, choices.api.options.elysia)).toBeDisabled()
    expect(command()).toContain("--api hono")

    await user.click(answer(choices.deployment.label, choices.deployment.options.self))
    await user.click(answer(choices.api.label, choices.api.options.elysia))
    await user.click(answer(choices.runtime.label, choices.runtime.options.bun))
    await user.click(answer(choices.database.label, choices.database.options.sqlite))
    expect(answer(choices.provider.label, choices.provider.options.turso)).toBeChecked()
    expect(command()).toContain("--provider turso")

    await user.click(answer(choices.deployment.label, choices.deployment.options.cloudflare))
    expect(answer(choices.api.label, choices.api.options.hono)).toBeChecked()
    expect(answer(choices.runtime.label, choices.runtime.options.node)).toBeChecked()
    expect(answer(choices.provider.label, choices.provider.options.turso)).toBeChecked()

    await user.click(answer(choices.architecture.label, choices.architecture.options.monolith))
    expect(within(question(choices.api.label)).queryByRole("radio", { checked: true })).not.toBeInTheDocument()
    expect(command()).not.toContain("--api")
  })

  it("keeps an answer when its option is pressed again", async () => {
    const user = renderConfigurator()

    await user.click(answer(choices.framework.label, choices.framework.options.tanstack))
    expect(answer(choices.framework.label, choices.framework.options.tanstack)).toBeChecked()
    expect(command()).toContain("--framework tanstack")
  })

  it("toggles extras and drops one from the command when another answer rules it out", async () => {
    const user = renderConfigurator()
    const extras = screen.getByRole("toolbar", { name: choices.extras.label })
    const extra = (name: string): HTMLElement => within(extras).getByRole("button", { name })

    await user.click(extra(choices.extras.options.commerce))
    expect(extra(choices.extras.options.commerce)).toHaveAttribute("aria-pressed", "true")
    expect(command()).toContain("--with commerce")
    await user.click(extra(choices.extras.options.commerce))
    expect(command()).not.toContain("--with commerce")

    await user.click(extra(choices.extras.options.courses))
    await user.click(extra(choices.extras.options["post-editor"]))
    await user.click(answer(choices.billing.label, choices.billing.options.none))
    expect(extra(choices.extras.options.courses)).toBeDisabled()
    expect(extra(choices.extras.options.courses)).toHaveAttribute("aria-pressed", "false")
    expect(extra(choices.extras.options.courses)).toHaveAccessibleDescription(choices.extras.note)
    expect(command()).not.toContain("--with courses")
    expect(command()).toContain("--with post-editor")

    await user.click(answer(choices.billing.label, choices.billing.options.polar))
    expect(extra(choices.extras.options.courses)).toHaveAttribute("aria-pressed", "false")
    expect(command()).not.toContain("--with courses")
  })

  it("moves between options with the arrow keys, answers with Space or Enter, and leaves the question with Tab", async () => {
    const user = renderConfigurator()

    await user.click(answer(choices.framework.label, choices.framework.options.tanstack))
    await user.keyboard("{ArrowRight}")
    expect(answer(choices.framework.label, choices.framework.options.next)).toHaveFocus()
    expect(answer(choices.framework.label, choices.framework.options.tanstack)).toBeChecked()

    await user.keyboard(" ")
    expect(answer(choices.framework.label, choices.framework.options.next)).toBeChecked()
    expect(command()).toContain("--framework next")

    await user.keyboard("{ArrowRight}{Enter}")
    expect(answer(choices.framework.label, choices.framework.options["react-router"])).toBeChecked()
    await user.keyboard("{ArrowLeft}")
    expect(answer(choices.framework.label, choices.framework.options.next)).toHaveFocus()

    await user.tab()
    expect(answer(choices.architecture.label, choices.architecture.options.monolith)).toHaveFocus()
  })

  it("copies the selected runner and extra flags with matching development instructions", async () => {
    const user = renderConfigurator()

    await user.click(screen.getByRole("button", { name: choices.extras.options["page-builder"] }))
    await user.click(screen.getByRole("radio", { name: PACKAGE_MANAGER.PNPM.id }))
    await user.click(screen.getByRole("button", { name: english.cli.copy }))
    const copied = await navigator.clipboard.readText()
    expect(copied).toContain(`${PACKAGE_MANAGER.PNPM.exec} ${SCAFFOLD_TARGET}`)
    expect(copied).toContain("--with page-builder")
    expect(copied).not.toContain("--with courses")
    expect(screen.getByText(PACKAGE_MANAGER.PNPM.dev)).toBeVisible()
  })
})
