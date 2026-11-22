import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import type { AccountDeletionNotice } from "~/src/data/account-deletion"

import { LicenseDeletionNotice } from "~/src/presentation/components/custom/app/license-deletion-notice"

export const LICENSE_ACCOUNT_DELETION = [
  {
    Notice: LicenseDeletionNotice,
    key: "license",
    load: ({ queryClient }) => queryClient.query({ ...currentLicenseQuery, staleTime: "static" }),
  },
] as const satisfies readonly AccountDeletionNotice[]
