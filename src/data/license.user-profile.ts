import { userLicenseQuery } from "~/src/modules/license/use-cases/get-user-license"

import type { UserProfileSection } from "~/src/data/user-profile"

import { UserLicensePending } from "~/src/presentation/components/custom/admin/license-pending"
import { UserLicense } from "~/src/presentation/components/custom/admin/users/user-license"

export const LICENSE_USER_PROFILE = [
  {
    Pending: UserLicensePending,
    Section: UserLicense,
    key: "license",
    load: ({ queryClient, userId }) => queryClient.query(userLicenseQuery({ userId })),
  },
] as const satisfies readonly UserProfileSection[]
