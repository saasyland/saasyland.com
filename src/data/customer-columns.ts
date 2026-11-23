import type { JSX } from "react"

import * as AREA_CUSTOMER_COLUMNS from "~/src/data/customer-columns.entries"

export interface CustomerColumn {
  readonly Cell: (props: { readonly accounts: readonly string[]; readonly userId: string }) => JSX.Element
  readonly header: string
  readonly key: string
}

const AREAS: Readonly<Record<string, readonly CustomerColumn[]>> = AREA_CUSTOMER_COLUMNS

export const CUSTOMER_COLUMNS = Object.values(AREAS).flat()
