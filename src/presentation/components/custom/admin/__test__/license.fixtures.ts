import type { QueryClient } from "@tanstack/react-query"

import { unlicensedOrdersQuery } from "~/src/modules/license/use-cases/get-unlicensed-orders"
import { userLicenseQuery } from "~/src/modules/license/use-cases/get-user-license"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"

export const seedLicenseQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(userLicenseQuery({ userId: adminUser().id }).queryKey, { license: undefined })
  queryClient.setQueryData(unlicensedOrdersQuery.queryKey, { rows: [] })
}
