import { cleanup, render, screen, within } from "@testing-library/react"
import userEvent, { type UserEvent } from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { MotionProvider } from "~/src/providers/motion-provider"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CLI_CHOICES, SCAFFOLD_TARGET } from "~/src/data/cli"

import { CliConfigurator } from "~/src/presentation/components/custom/landing-page/components/cli-configurator"

import english from "~/messages/en-US/pages.landing.json"

vi.mock(import("~/src/data/cli"), async (importOriginal) => {
  const actual = await importOriginal()

  return {
    ...actual,
    CLI_TEMPLATE_SUPPORT: {
      choices: {
        ...actual.CLI_TEMPLATE_SUPPORT.choices,
        ...Object.fromEntries(actual.CLI_CHOICES.map((choice) => [choice.id, choice.options.map((option) => option.id)])),
      },
      extras: actual.CLI_EXTRAS.map((extra) => extra.id),
    },
  }
})

const { choices, coming } = english.cli

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

const extra = (name: string): HTMLElement =>
  within(screen.getByRole("toolbar", { name: choices.extras.label })).getByRole("button", { name })

const optionCount = (): number => screen.getAllByRole("radio").filter((radio) => radio.closest("dl")).length

const command = (): string => screen.getByText(SCAFFOLD_TARGET, { exact: false }).closest("code")?.textContent ?? ""

afterEach(() => {
  cleanup()
})

describe("CLI configurator once the templates generate every option", () => {
  it("enables every option no other answer rules out, without the reason for options that are coming", () => {
    renderConfigurator()

    expect(answer(choices.framework.label, choices.framework.options.next)).toBeEnabled()
    expect(answer(choices.framework.label, choices.framework.options.next)).not.toHaveAccessibleDescription()
    expect(answer(choices.billing.label, choices.billing.options.polar)).toBeChecked()
    expect(extra(choices.extras.options.commerce)).toBeEnabled()
    expect(screen.queryByRole("radio", { description: coming })).not.toBeInTheDocument()
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
    expect(answer(choices.database.label, choices.database.options.sqlite)).toHaveAccessibleDescription(choices.database.note)
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

  it("toggles extras and drops one from the command when another answer rules it out", async () => {
    const user = renderConfigurator()

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
})
