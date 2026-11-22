import { userActivationsQuery } from "~/src/modules/license/use-cases/get-user-activations"
import { userLicenseQuery } from "~/src/modules/license/use-cases/get-user-license"
import { userWithdrawalsQuery } from "~/src/modules/withdrawal/use-cases/get-user-withdrawals"

import { OPENED_LESSON_TITLES } from "~/src/data/opened-lesson"
import type { UserProfileSection } from "~/src/data/user-profile"

import { UserLicensePending, UserWithdrawalsPending } from "~/src/presentation/components/custom/admin/license-pending"
import { UserLicense } from "~/src/presentation/components/custom/admin/users/user-license"
import { UserWithdrawals } from "~/src/presentation/components/custom/admin/users/user-withdrawals"

export const LICENSE_USER_PROFILE = [
  {
    Pending: UserLicensePending,
    Section: UserLicense,
    key: "license",
    load: async ({ queryClient, userId }) => {
      const [{ license }] = await Promise.all([
        queryClient.query(userLicenseQuery({ userId })),
        queryClient.query(userActivationsQuery({ userIds: [userId] })),
      ])
      const lessonId = license?.openedLessonId

      if (typeof lessonId === "string") {
        await Promise.all(OPENED_LESSON_TITLES.map(({ load }) => load({ lessonId, queryClient })))
      }
    },
  },
  {
    Pending: UserWithdrawalsPending,
    Section: UserWithdrawals,
    key: "withdrawals",
    load: ({ queryClient, userId }) => queryClient.query(userWithdrawalsQuery({ userId })),
  },
] as const satisfies readonly UserProfileSection[]
