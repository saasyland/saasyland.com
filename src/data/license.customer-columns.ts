import type { CustomerColumn } from "~/src/data/customer-columns"

import { CustomerMachines } from "~/src/presentation/components/custom/admin/users/license-machines"

export const LICENSE_CUSTOMER_COLUMNS = [
  { Cell: CustomerMachines, header: "pages.admin.users.license.activations.header", key: "machines" },
] as const satisfies readonly CustomerColumn[]
