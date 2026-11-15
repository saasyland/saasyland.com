import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import type { AppOverviewArea } from "~/src/data/app-overview"
import { licenseSearchSchema } from "~/src/data/license"
import { LICENSE_OFFER_SECTIONS } from "~/src/data/license-offer"

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
          ...LICENSE_OFFER_SECTIONS.map(({ load }) => load({ locale, queryClient })),
        ]),
    },
  ],
} as const satisfies AppOverviewArea
