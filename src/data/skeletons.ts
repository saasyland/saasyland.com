import type { JSX } from "react"

import * as AREA_SKELETONS from "~/src/data/skeletons.entries"

export interface AdminSkeleton {
  readonly pendingComponent: () => JSX.Element
  readonly to: string
}

export const ADMIN_SKELETONS = new Map<string, AdminSkeleton["pendingComponent"]>(
  Object.values(AREA_SKELETONS)
    .flat()
    .map(({ pendingComponent, to }) => [to, pendingComponent]),
)
