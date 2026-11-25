import type { TableRows } from "~/src/integrations/drizzle-orm/__test__/rows"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { newsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.schema"
import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"

export const NEWSLETTER_ROWS = [
  {
    insert: () => [
      db
        .insert(newsletterSubscriber)
        .values({ email: "schema@example.test", id: "schema-subscriber", unsubscribeToken: "token" })
        .returning(),
      db
        .insert(newsletterIssue)
        .values({
          body: { [I18N.DEFAULT_LOCALE]: "Body" },
          id: "schema-issue",
          recipientCount: 0,
          subject: { [I18N.DEFAULT_LOCALE]: "Subject" },
        })
        .returning(),
    ],
  },
] as const satisfies readonly TableRows[]
