import { render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { Route as LicenceRoute } from "~/src/routes/_landing.licence"
import { Route as PrivacyRoute } from "~/src/routes/_landing.privacy"
import { Route as RefundsRoute } from "~/src/routes/_landing.refunds"
import { Route as TermsRoute } from "~/src/routes/_landing.terms"

import licence from "~/messages/en-US/pages.legal.licence.json"
import privacy from "~/messages/en-US/pages.legal.privacy.json"
import refunds from "~/messages/en-US/pages.legal.refunds.json"
import terms from "~/messages/en-US/pages.legal.terms.json"

const DOCUMENTS = [
  { copy: licence, document: "licence", route: LicenceRoute },
  { copy: privacy, document: "privacy", route: PrivacyRoute },
  { copy: refunds, document: "refunds", route: RefundsRoute },
  { copy: terms, document: "terms", route: TermsRoute },
] as const

it.each(I18N.SUPPORTED_LOCALES)("renders every legal document completely in %s", (locale) => {
  const messages = getTestMessages(locale)

  for (const { copy, document, route } of DOCUMENTS) {
    const Page = route.options.component
    if (Page === undefined) {
      throw new Error(`The ${document} route has no page component`)
    }
    const view = render(
      <IntlProvider locale={locale} messages={messages}>
        <Page />
      </IntlProvider>,
    )
    const title = screen.getByRole("heading", { level: 1 })
    expect(messages).toHaveProperty(["pages", "legal", document, "title"], title.textContent)
    expect(messages).toHaveProperty(["pages", "legal", document, "lastUpdated"], title.previousElementSibling?.textContent)
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(Object.keys(copy.sections).length)
    view.unmount()
  }
})
