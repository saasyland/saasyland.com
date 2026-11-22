import { lazyRouteComponent } from "@tanstack/react-router"

import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import { currentLicenseKeyQuery } from "~/src/modules/license/use-cases/get-current-license-key"

import type { AppOverviewArea } from "~/src/data/app-overview"
import { licenseSearchSchema } from "~/src/data/license"
import { LICENSE_OFFER_SECTIONS } from "~/src/data/license-offer"

import { LicenseOverviewPending } from "~/src/presentation/components/custom/app/license-pending"

export const LICENSE_APP_OVERVIEW = {
  search: licenseSearchSchema.shape,
  sections: [
    {
      Pending: LicenseOverviewPending,
      Section: lazyRouteComponent(() => import("~/src/presentation/components/custom/app/license-overview"), "LicenseOverview"),
      key: "license",
      load: ({ locale, queryClient }) =>
        Promise.all([
          queryClient.query({ ...currentLicenseQuery, staleTime: "static" }),
          queryClient.query({ ...currentLicenseKeyQuery, staleTime: "static" }),
          ...LICENSE_OFFER_SECTIONS.map(({ load }) => load({ locale, queryClient })),
          ...LICENSE_OFFER_SECTIONS.map(({ Section }) => Section.preload?.()),
        ]),
    },
  ],
} as const satisfies AppOverviewArea
