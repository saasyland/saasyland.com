import { render } from "react-email"
import { expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import messages from "~/messages/en-US/emails.newsletter-notification-email.json"
import { NewsletterNotificationEmail } from "~/src/presentation/emails/newsletter-notification-email"

it("tells the owner in the default language which address subscribed from which locale", async () => {
  const html = await render(<NewsletterNotificationEmail email="ada@example.test" locale="pl-PL" messages={messages} />)

  expect(html).toContain(`lang="${I18N.DEFAULT_LOCALE}"`)
  expect(html).toContain(messages.preview)
  expect(html).toContain(messages.heading)
  expect(html).toContain("ada@example.test confirmed a subscription from the pl-PL landing page.")
  expect(html).not.toContain("{email}")
})
