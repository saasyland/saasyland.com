import type { JSX } from "react"

import * as AREA_SKELETONS from "~/src/data/skeletons.entries"

export interface PageSkeleton {
  readonly pendingComponent: () => JSX.Element
  readonly to: string
}

export const PAGE_SKELETONS = new Map<string, PageSkeleton["pendingComponent"]>(
  Object.values(AREA_SKELETONS)
    .flat()
    .map(({ pendingComponent, to }) => [to, pendingComponent]),
)
