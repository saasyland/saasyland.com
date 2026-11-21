import type { JSX } from "react"

import * as AREA_APP_BADGES from "~/src/data/app-badges.entries"

export interface AppBadge {
  readonly Badge: () => JSX.Element | undefined
  readonly to: string
}

const AREAS: Readonly<Record<string, readonly AppBadge[]>> = AREA_APP_BADGES

const BADGES = Object.values(AREAS).flat()

export const appBadge = (to: string): AppBadge | undefined => BADGES.find((badge) => badge.to === to)
