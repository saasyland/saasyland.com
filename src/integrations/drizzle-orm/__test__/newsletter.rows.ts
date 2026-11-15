import type { AreaRows } from "~/src/integrations/drizzle-orm/__test__/rows"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { newsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.schema"

export const NEWSLETTER_ROWS = [
  {
    insert: () => [
      db
        .insert(newsletterSubscriber)
        .values({ email: "schema@example.test", id: "schema-subscriber", unsubscribeToken: "token" })
        .returning(),
    ],
  },
] as const satisfies readonly AreaRows[]
