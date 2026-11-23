import { lazyRouteComponent } from "@tanstack/react-router"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { lessonTitleQuery } from "~/src/modules/lesson/use-cases/get-lesson-title"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import { currentLicenseKeyQuery } from "~/src/modules/license/use-cases/get-current-license-key"
import { licenseCountsQuery } from "~/src/modules/license/use-cases/get-license-counts"
import { unlicensedOrdersQuery } from "~/src/modules/license/use-cases/get-unlicensed-orders"
import { userActivationsQuery } from "~/src/modules/license/use-cases/get-user-activations"
import { userLicenseQuery } from "~/src/modules/license/use-cases/get-user-license"
import { userWithdrawalsQuery } from "~/src/modules/withdrawal/use-cases/get-user-withdrawals"

import type { BrowserArea } from "~/src/areas/browser"
import { DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"
import { licenseSearchSchema, redirectTierSchema } from "~/src/data/license"

import { UserLicensePending, UserWithdrawalsPending } from "~/src/presentation/components/custom/admin/license-pending"
import { LicenseCountsPending } from "~/src/presentation/components/custom/admin/license/license-counts-pending"
import { UnlicensedOrdersPending } from "~/src/presentation/components/custom/admin/license/unlicensed-orders-pending"
import { LicenseOverviewPending, SignUpOrderSummaryPending } from "~/src/presentation/components/custom/app/license-pending"

export const LICENSE_BROWSER = {
  accountDeletion: [
    {
      Notice: lazyRouteComponent(() => import("~/src/presentation/components/custom/app/license-deletion-notice"), "LicenseDeletionNotice"),
      key: "license",
      load: ({ queryClient }) => queryClient.query({ ...currentLicenseQuery, staleTime: "static" }),
    },
  ],
  appOverview: [
    {
      Pending: LicenseOverviewPending,
      Section: lazyRouteComponent(() => import("~/src/presentation/components/custom/app/license-overview"), "LicenseOverview"),
      key: "license",
      load: ({ locale, queryClient }) =>
        Promise.all([
          queryClient.query({ ...currentLicenseQuery, staleTime: "static" }),
          queryClient.query({ ...currentLicenseKeyQuery, staleTime: "static" }),
          queryClient.query(catalogueQuery({ locale })),
        ]),
    },
  ],
  appOverviewSearch: licenseSearchSchema.shape,
  dashboard: [
    {
      Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/license/unlicensed-orders"), "UnlicensedOrders"),
      Pending: UnlicensedOrdersPending,
      key: "unlicensedOrders",
      order: 5,
      placement: DASHBOARD_PLACEMENT.PANEL,
      prefetch: (queryClient) => queryClient.query({ ...unlicensedOrdersQuery, staleTime: "static" }),
    },
    {
      Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/license/license-counts"), "LicenseCounts"),
      Pending: LicenseCountsPending,
      key: "licenses",
      order: 7,
      placement: DASHBOARD_PLACEMENT.PANEL,
      prefetch: (queryClient) => queryClient.query({ ...licenseCountsQuery, staleTime: "static" }),
    },
  ],
  layoutNamespaces: [
    { layout: "/app", namespaces: ["pages.license", "pages.withdrawal", "withdrawal.validations"] },
    { layout: "/_site/_marketing", namespaces: ["withdrawal.validations"] },
    { layout: "/admin/users", namespaces: ["pages.admin.users.license"] },
  ],
  name: "license",
  signUpIntros: [
    {
      Intro: lazyRouteComponent(() => import("~/src/presentation/components/custom/app/sign-up-order-summary"), "SignUpOrderSummary"),
      Pending: SignUpOrderSummaryPending,
      appliesTo: (redirect) => redirectTierSchema.safeParse(redirect).success,
      key: "order-summary",
    },
  ],
  userProfile: [
    {
      Pending: UserLicensePending,
      Section: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/users/user-license"), "UserLicense"),
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
      Section: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/users/user-withdrawals"), "UserWithdrawals"),
      key: "withdrawals",
      load: ({ queryClient, userId }) => queryClient.query(userWithdrawalsQuery({ userId })),
    },
  ],
} as const satisfies BrowserArea
