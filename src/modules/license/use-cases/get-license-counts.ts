import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { count } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"

import { LICENSE_QUERY_KEYS, LICENSE_STATUS, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"

type LicenseGroup = Pick<typeof license.$inferSelect, "status" | "tier"> & { readonly licenses: number }

const licensesIn = (groups: readonly LicenseGroup[], { status, tier }: Omit<LicenseGroup, "licenses">): number =>
  groups.filter((group) => group.status === status && group.tier === tier).reduce((total, group) => total + group.licenses, 0)

export const getLicenseCounts = createServerFn({ method: "GET" })
  .middleware([authorized({ admin: ["access"] })])
  .handler(async () => {
    const groups = await db
      .select({ licenses: count(), status: license.status, tier: license.tier })
      .from(license)
      .groupBy(license.tier, license.status)

    return {
      rows: LICENSE_TIERS.map((tier) => ({
        [LICENSE_STATUS.ACTIVE]: licensesIn(groups, { status: LICENSE_STATUS.ACTIVE, tier }),
        [LICENSE_STATUS.REFUNDED]: licensesIn(groups, { status: LICENSE_STATUS.REFUNDED, tier }),
        [LICENSE_STATUS.REVOKED]: licensesIn(groups, { status: LICENSE_STATUS.REVOKED, tier }),
        id: tier,
        tier,
      })),
    }
  })

export const licenseCountsQuery = queryOptions({ queryFn: () => getLicenseCounts(), queryKey: LICENSE_QUERY_KEYS.COUNTS })
