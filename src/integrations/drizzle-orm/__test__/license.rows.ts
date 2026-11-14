import { eq } from "drizzle-orm"

import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_TIER } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"

export const LICENSE_ROWS = {
  insert: ({ userId }: { readonly userId: string }) => [
    db.insert(license).values({ id: "schema-license", polarCustomerId: "polar-customer", tier: LICENSE_TIER.CORE, userId }).returning(),
  ],
  owned: (userId: string) => db.select().from(license).where(eq(license.userId, userId)),
}
