import { render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { describe, expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { ChangelogLinks, type ChangelogLinksProps } from "~/src/presentation/components/custom/changelog-links"

import { APP_GITHUB_URL } from "~/src/presentation/branding"

const PULL_REQUEST = "257"
const COMMIT = "0b9a1b9865859643bedbbb41c3f26b3ff6a1eede"
const SHORT_COMMIT = "0b9a1b9"

const renderLinks = (props: ChangelogLinksProps, locale: SupportedLocale = I18N.DEFAULT_LOCALE) =>
  render(
    <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
      <ChangelogLinks {...props} />
    </IntlProvider>,
  )

describe("ChangelogLinks", () => {
  it("links an entry to the pull request it came from, named for screen readers", () => {
    renderLinks({ pullRequest: PULL_REQUEST })

    const link = screen.getByRole("link", { name: `Pull request #${PULL_REQUEST}` })

    expect(link).toHaveAttribute("href", `${APP_GITHUB_URL}/pull/${PULL_REQUEST}`)
    expect(link).toHaveTextContent(`#${PULL_REQUEST}`)
  })

  it("links an entry that reached main without a pull request to its commit, shown by its short hash", () => {
    renderLinks({ commit: COMMIT })

    const link = screen.getByRole("link", { name: `Commit ${SHORT_COMMIT}` })

    expect(link).toHaveAttribute("href", `${APP_GITHUB_URL}/commit/${COMMIT}`)
    expect(link).toHaveTextContent(SHORT_COMMIT)
  })

  it.each(I18N.SUPPORTED_LOCALES)("names the links in %s with the text they show", (locale) => {
    renderLinks({ pullRequest: PULL_REQUEST }, locale)
    renderLinks({ commit: COMMIT }, locale)

    const [pullRequest, commit] = screen.getAllByRole("link")

    expect(pullRequest?.getAttribute("aria-label")).toContain(`#${PULL_REQUEST}`)
    expect(commit?.getAttribute("aria-label")).toContain(SHORT_COMMIT)
  })
})
