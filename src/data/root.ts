import type { JSX } from "react"

import * as AREA_ROOT_COMPONENTS from "~/src/data/root.entries"

export interface RootComponentEntry {
  readonly component: () => JSX.Element | undefined
  readonly key: string
}

const AREAS: Readonly<Record<string, readonly RootComponentEntry[]>> = AREA_ROOT_COMPONENTS

export const ROOT_COMPONENTS = Object.values(AREAS).flat()
