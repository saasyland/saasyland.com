import type { JSX } from "react"

import type { QueryClient } from "@tanstack/react-query"

import { lessonTitleQuery } from "~/src/modules/lesson/use-cases/get-lesson-title"
import { userActivationsQuery } from "~/src/modules/license/use-cases/get-user-activations"
import { userLicenseQuery } from "~/src/modules/license/use-cases/get-user-license"
import { userOrdersQuery } from "~/src/modules/order/use-cases/get-user-orders"
import { userWithdrawalsQuery } from "~/src/modules/withdrawal/use-cases/get-user-withdrawals"

import { UserLicensePending, UserWithdrawalsPending } from "~/src/presentation/components/custom/admin/license-pending"
import { UserOrdersPending } from "~/src/presentation/components/custom/admin/payments-pending"
import { UserOrders } from "~/src/presentation/components/custom/admin/payments/user-orders"
import { UserLicense } from "~/src/presentation/components/custom/admin/users/user-license"
import { UserWithdrawals } from "~/src/presentation/components/custom/admin/users/user-withdrawals"

interface UserProfileSection {
  readonly key: string
  readonly load: (context: { readonly queryClient: QueryClient; readonly userId: string }) => Promise<unknown>
  readonly Pending: () => JSX.Element
  readonly Section: (props: { readonly userId: string }) => JSX.Element
}

export const USER_PROFILE_SECTIONS: readonly UserProfileSection[] = [
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
        await queryClient.query(lessonTitleQuery({ lessonId }))
      }
    },
  },
  {
    Pending: UserWithdrawalsPending,
    Section: UserWithdrawals,
    key: "withdrawals",
    load: ({ queryClient, userId }) => queryClient.query(userWithdrawalsQuery({ userId })),
  },
  {
    Pending: UserOrdersPending,
    Section: UserOrders,
    key: "orders",
    load: ({ queryClient, userId }) => queryClient.query(userOrdersQuery({ userId })),
  },
]

export const UserProfileSections = ({ userId }: { readonly userId: string }): JSX.Element => (
  <>
    {USER_PROFILE_SECTIONS.map(({ key, Section }) => (
      <Section key={key} userId={userId} />
    ))}
  </>
)
