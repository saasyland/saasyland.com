import { render } from "react-email"
import { expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import type issueMessages from "~/messages/en-US/emails.newsletter-issue-email.json"
import { APP_DOMAIN } from "~/src/presentation/branding"
import { NEWSLETTER_ISSUE_NAMESPACE, NewsletterIssueEmail } from "~/src/presentation/emails/newsletter-issue-email"

it.each(I18N.SUPPORTED_LOCALES)(
  "renders an issue in %s with its paragraphs, the reason it is sent and its unsubscribe link",
  async (locale) => {
    const messages = await loadNamespace<typeof issueMessages>({ locale, namespace: NEWSLETTER_ISSUE_NAMESPACE })
    const unsubscribeUrl = `https://example.com/${locale}/newsletter/unsubscribe?token=example`

    const html = await render(
      <NewsletterIssueEmail
        content={{ locale, paragraphs: ["First paragraph", "Second\nparagraph"], subject: "Issue one" }}
        messages={messages}
        unsubscribeUrl={unsubscribeUrl}
      />,
    )

    expect(html).toContain(`lang="${locale}"`)
    expect(html).toContain("Issue one")
    expect(html).toContain("First paragraph")
    expect(html).toContain(`href="${unsubscribeUrl}"`)
    expect(html).toContain(APP_DOMAIN)
    expect(html).toContain(messages.unsubscribe)
    expect(html).not.toContain("{appDomain}")
  },
)

it("previews the subject when the issue has no paragraph", async () => {
  const messages = await loadNamespace<typeof issueMessages>({ locale: I18N.DEFAULT_LOCALE, namespace: NEWSLETTER_ISSUE_NAMESPACE })

  const html = await render(
    <NewsletterIssueEmail
      content={{ locale: I18N.DEFAULT_LOCALE, paragraphs: [], subject: "Only a subject" }}
      messages={messages}
      unsubscribeUrl="https://example.com/u"
    />,
  )

  expect(html.split("Only a subject").length).toBeGreaterThan(2)
})
