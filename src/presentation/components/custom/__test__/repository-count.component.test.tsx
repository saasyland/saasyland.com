import { render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { RepositoryCount } from "~/src/presentation/components/custom/repository-count"

describe("RepositoryCount", () => {
  it.each(["en-US", "de-DE"] as const)("prints a measured repository count formatted for %s", (locale) => {
    render(
      <IntlProvider locale={locale} messages={{}} timeZone="UTC">
        <p>
          <RepositoryCount fact="testFiles" /> test files
        </p>
      </IntlProvider>,
    )

    expect(screen.getByText(`${new Intl.NumberFormat(locale).format(REPOSITORY_FACTS.testFiles)} test files`)).toBeVisible()
  })
})
