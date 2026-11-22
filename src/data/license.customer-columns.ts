import type { CustomerColumn } from "~/src/data/customer-columns"

import { CustomerMachines, CustomerMachinesHeader } from "~/src/presentation/components/custom/admin/users/license-machines"

export const LICENSE_CUSTOMER_COLUMNS = [
  { Cell: CustomerMachines, Header: CustomerMachinesHeader, key: "machines" },
] as const satisfies readonly CustomerColumn[]
