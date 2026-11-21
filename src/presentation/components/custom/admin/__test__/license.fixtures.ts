import type { QueryClient } from "@tanstack/react-query"

import { LICENSE_STATUS, LICENSE_TIERS } from "~/src/modules/license/license.constants"
import { licenseCountsQuery } from "~/src/modules/license/use-cases/get-license-counts"
import { unlicensedOrdersQuery } from "~/src/modules/license/use-cases/get-unlicensed-orders"
import { userLicenseQuery } from "~/src/modules/license/use-cases/get-user-license"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"

export const seedLicenseQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(userLicenseQuery({ userId: adminUser().id }).queryKey, { license: undefined })
  queryClient.setQueryData(unlicensedOrdersQuery.queryKey, { rows: [] })
  queryClient.setQueryData(licenseCountsQuery.queryKey, {
    rows: LICENSE_TIERS.map((tier) => ({
      [LICENSE_STATUS.ACTIVE]: 0,
      [LICENSE_STATUS.REFUNDED]: 0,
      [LICENSE_STATUS.REVOKED]: 0,
      id: tier,
      tier,
    })),
  })
}
