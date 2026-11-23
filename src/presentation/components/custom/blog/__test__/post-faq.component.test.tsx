import { cleanup, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { LICENSE_ACTIVATION_LIMITS, LICENSE_TIER } from "~/src/modules/license/license.constants"

import { TIER_PRICES } from "~/src/data/marketing"
import { CURRENCY_FORMAT } from "~/src/data/pricing"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { PostFaq } from "~/src/presentation/components/custom/blog/post-faq"

const ENTRIES = [
  { answer: "Core costs {corePrice} and runs on {coreMachines, number} machines.", question: "What does Core cost?" },
  { answer: "The site has {testFiles, number} test files.", question: "Is coverage held at {coverageThreshold, number}%?" },
]

const renderFaq = (entries: Parameters<typeof PostFaq>[0]["entries"], locale: SupportedLocale = "en-US") =>
  render(
    <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
      <PostFaq entries={entries} />
    </IntlProvider>,
  )

afterEach(cleanup)

describe("PostFaq", () => {
  it.each(["en-US", "de-DE"] as const)(
    "renders each question and answer with the prices, limits and counts the code defines in %s",
    async (locale) => {
      const user = userEvent.setup({ delay: null })
      const number = new Intl.NumberFormat(locale)
      const price = new Intl.NumberFormat(locale, CURRENCY_FORMAT).format(TIER_PRICES[LICENSE_TIER.CORE])
      const answers = [
        `Core costs ${price} and runs on ${number.format(LICENSE_ACTIVATION_LIMITS[LICENSE_TIER.CORE])} machines.`,
        `The site has ${number.format(REPOSITORY_FACTS.testFiles)} test files.`,
      ]
      renderFaq(ENTRIES, locale)

      const questions = ["What does Core cost?", `Is coverage held at ${number.format(REPOSITORY_FACTS.coverageThreshold)}%?`]
      for (const [index, question] of questions.entries()) {
        await user.click(screen.getByRole("button", { name: question }))
        expect(screen.getByText(answers[index]?.replaceAll(/\s/gu, " ") ?? "")).toBeVisible()
      }
    },
  )

  it("renders no question for a post without a FAQ", () => {
    renderFaq(undefined)

    expect(screen.queryByRole("button")).not.toBeInTheDocument()
  })
})
