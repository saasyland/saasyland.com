import type { JSX } from "react"

import * as AREA_USER_TABS from "~/src/data/user-tabs.entries"

export interface UserTab {
  readonly area: string
  readonly key: string
  readonly order: number
  readonly pendingComponent: () => JSX.Element
  readonly to: string
}

const AREAS: Readonly<Record<string, readonly UserTab[]>> = AREA_USER_TABS

export const USER_TABS = Object.values(AREAS)
  .flat()
  .toSorted((first, second) => first.order - second.order)
