import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import { currentLicenseKeyQuery } from "~/src/modules/license/use-cases/get-current-license-key"

import type { AppOverviewArea } from "~/src/data/app-overview"
import { licenseSearchSchema } from "~/src/data/license"

import { LicenseOverview } from "~/src/presentation/components/custom/app/license-overview"
import { LicenseOverviewPending } from "~/src/presentation/components/custom/app/license-pending"

export const LICENSE_APP_OVERVIEW = {
  search: licenseSearchSchema.shape,
  sections: [
    {
      Pending: LicenseOverviewPending,
      Section: LicenseOverview,
      key: "license",
      load: ({ locale, queryClient }) =>
        Promise.all([
          queryClient.query({ ...currentLicenseQuery, staleTime: "static" }),
          queryClient.query({ ...currentLicenseKeyQuery, staleTime: "static" }),
          queryClient.query(catalogueQuery({ locale })),
        ]),
    },
  ],
} as const satisfies AppOverviewArea
