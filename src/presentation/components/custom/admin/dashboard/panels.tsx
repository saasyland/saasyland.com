import { type JSX, Suspense } from "react"

import { CourseProgress } from "~/src/presentation/components/custom/admin/courses/course-progress"
import { DASHBOARD_PANELS, type DashboardPanelKey } from "~/src/presentation/components/custom/admin/dashboard/panels-pending"
import { SignupsChart } from "~/src/presentation/components/custom/admin/dashboard/signups-chart"
import { LicenseCounts } from "~/src/presentation/components/custom/admin/license/license-counts"
import { UnlicensedOrders } from "~/src/presentation/components/custom/admin/license/unlicensed-orders"
import { RevenueChart } from "~/src/presentation/components/custom/admin/payments/revenue-chart"

const PANELS: Readonly<Record<DashboardPanelKey, () => JSX.Element>> = {
  licenses: LicenseCounts,
  progress: CourseProgress,
  revenue: RevenueChart,
  signups: SignupsChart,
  unlicensedOrders: UnlicensedOrders,
}

export const DashboardPanels = (): JSX.Element => (
  <>
    {DASHBOARD_PANELS.map(({ key, Pending }) => {
      const Panel = PANELS[key]

      return (
        <Suspense fallback={<Pending />} key={key}>
          <Panel />
        </Suspense>
      )
    })}
  </>
)
