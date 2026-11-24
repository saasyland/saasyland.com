import type { JSX } from "react"

import { usePagePending } from "~/src/hooks/use-page-pending"

import { AdminPageHeaderPending } from "~/src/presentation/components/custom/admin/admin-page-header"
import { USER_TABS } from "~/src/presentation/components/custom/admin/users/user-tabs"

export const AdminUsersPending = (): JSX.Element => {
  const Page = usePagePending("/admin/users")

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <AdminPageHeaderPending tabs={USER_TABS.length} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-8">{Page && <Page />}</div>
    </div>
  )
}
