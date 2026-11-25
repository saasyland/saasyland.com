import { eq } from "drizzle-orm"

import type { TableRows } from "~/src/integrations/drizzle-orm/__test__/rows"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import { WITHDRAWAL_CHANNEL, WITHDRAWAL_ELIGIBILITY } from "~/src/modules/withdrawal/withdrawal.constants"
import { withdrawal } from "~/src/modules/withdrawal/withdrawal.schema"

export const LICENSE_ROWS = [
  {
    insert: ({ userId }) => [
      db.insert(license).values({ id: "schema-license", polarCustomerId: "polar-customer", tier: LICENSE_TIER.CORE, userId }).returning(),
    ],
    owned: (userId) => db.select().from(license).where(eq(license.userId, userId)),
  },
  {
    insert: ({ userId }) => [
      db
        .insert(withdrawal)
        .values({
          channel: WITHDRAWAL_CHANNEL.ACCOUNT,
          eligibility: WITHDRAWAL_ELIGIBILITY.UNMATCHED,
          email: "schema@example.test",
          id: "schema-withdrawal",
          locale: I18N.DEFAULT_LOCALE,
          name: "Ada",
          reference: "SAASY-0001",
          userId,
        })
        .returning(),
    ],
    owned: (userId) => db.select().from(withdrawal).where(eq(withdrawal.userId, userId)),
  },
] as const satisfies readonly TableRows[]
