import type { JSX } from "react"

import * as AREAS from "~/src/areas/browser.entries"

export interface LayoutNamespaces {
  readonly layout: string
  readonly namespaces: readonly string[]
}

export interface RootComponent {
  readonly component: () => JSX.Element | undefined
  readonly key: string
}

export interface BrowserArea {
  readonly layoutNamespaces?: readonly LayoutNamespaces[]
  readonly name: string
  readonly rootComponents?: readonly RootComponent[]
  readonly useTimeZone?: () => string
}

export const BROWSER_AREAS: readonly BrowserArea[] = Object.values(AREAS)

export const ROOT_COMPONENTS = BROWSER_AREAS.flatMap(({ rootComponents = [] }) => rootComponents)

export const TIME_ZONE_HOOKS = BROWSER_AREAS.map(({ useTimeZone }) => useTimeZone).filter((useTimeZone) => useTimeZone !== undefined)

const LAYOUT_NAMESPACES = BROWSER_AREAS.flatMap(({ layoutNamespaces = [] }) => layoutNamespaces)

export const layoutNamespaces = (layout: string): readonly string[] =>
  LAYOUT_NAMESPACES.filter((entry) => entry.layout === layout).flatMap(({ namespaces }) => namespaces)
