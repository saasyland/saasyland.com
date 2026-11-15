import * as AREA_NAMESPACES from "~/src/data/namespaces.entries"

export interface LayoutNamespaces {
  readonly layout: string
  readonly namespaces: readonly string[]
}

const AREAS: Readonly<Record<string, readonly LayoutNamespaces[]>> = AREA_NAMESPACES

const ENTRIES = Object.values(AREAS).flat()

export const layoutNamespaces = (layout: string): readonly string[] =>
  ENTRIES.filter((entry) => entry.layout === layout).flatMap(({ namespaces }) => namespaces)
