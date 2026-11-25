import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { NEWSLETTER_SOURCE, NEWSLETTER_STATUS, NEWSLETTER_TOKEN_LENGTH } from "../../src/modules/newsletter-subscriber/newsletter-subscriber.constants"

export const TEST_NEWSLETTER_READERS = [
  {
    email: "newsletter.reader@example.test",
    id: "test-newsletter-reader",
    locale: I18N.DEFAULT_LOCALE,
    source: NEWSLETTER_SOURCE.FOOTER,
    status: NEWSLETTER_STATUS.SUBSCRIBED,
    unsubscribeToken: "1".repeat(NEWSLETTER_TOKEN_LENGTH),
  },
  {
    email: "=formula.reader@example.test",
    id: "test-newsletter-formula",
    locale: I18N.DEFAULT_LOCALE,
    source: NEWSLETTER_SOURCE.BLOG,
    status: NEWSLETTER_STATUS.PENDING,
    unsubscribeToken: "2".repeat(NEWSLETTER_TOKEN_LENGTH),
  },
] as const
