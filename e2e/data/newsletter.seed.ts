import { MILLISECONDS_PER_DAY } from "../../src/lib/duration"
import { NEWSLETTER_STATUS } from "../../src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { TEST_NEWSLETTER_READERS } from "./newsletter"
import { type TestSeed, literal } from "./seed"

export const newsletterSeed = (): Promise<TestSeed> => {
  const signedUp = Date.now() - MILLISECONDS_PER_DAY

  return Promise.resolve({
    objects: [],
    statements: TEST_NEWSLETTER_READERS.map(({ email, id, locale, source, status, unsubscribeToken }) => {
      const confirmed = status === NEWSLETTER_STATUS.SUBSCRIBED ? String(signedUp) : "NULL"

      return `INSERT INTO newsletter_subscriber (id, email, locale, source, status, unsubscribe_token, subscribed_at, created_at, updated_at) VALUES (${literal(id)}, ${literal(email)}, ${literal(locale)}, ${literal(source)}, ${literal(status)}, ${literal(unsubscribeToken)}, ${confirmed}, ${String(signedUp)}, ${String(signedUp)}) ON CONFLICT(id) DO UPDATE SET status = excluded.status, subscribed_at = excluded.subscribed_at, unsubscribed_at = NULL;`
    }),
  })
}
