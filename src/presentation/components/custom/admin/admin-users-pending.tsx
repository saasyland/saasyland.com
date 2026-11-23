import type { JSX } from "react"

import { usePagePending } from "~/src/hooks/use-page-pending"

import { BROWSER_AREAS } from "~/src/areas/browser"

import { AdminPageHeaderPending } from "~/src/presentation/components/custom/admin/admin-page-header"

const USER_TABS = BROWSER_AREAS.flatMap(({ userTabs = [] }) => userTabs)

export const AdminUsersPending = (): JSX.Element => {
  const Page = usePagePending("/admin/users")

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col">
      <AdminPageHeaderPending tabs={USER_TABS.length} />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-8">{Page && <Page />}</div>
    </div>
  )
}
