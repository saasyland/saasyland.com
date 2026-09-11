import { renderToStaticMarkup } from "react-dom/server"

import { IntlProvider } from "use-intl/react"
import { expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { NewsletterSubscriptionFields } from "~/src/presentation/components/custom/newsletter/newsletter-subscription-fields"

it("renders the email field on the server without a document or moving focus", () => {
  const html = renderToStaticMarkup(
    <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
      <NewsletterSubscriptionFields isPending={false} isReadOnly value="" />
    </IntlProvider>,
  )
  expect(html).toContain('type="email"')
  expect(html).toContain('readOnly=""')
  expect(html).not.toContain("autofocus")
})
