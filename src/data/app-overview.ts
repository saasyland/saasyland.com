import type { JSX } from "react"

import type { QueryClient } from "@tanstack/react-query"
import type { AsyncRouteComponent } from "@tanstack/react-router"
import * as zod from "zod"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import * as AREA_APP_OVERVIEW from "~/src/data/app-overview.entries"

export interface AppOverviewSection {
  readonly key: string
  readonly load: (context: { readonly locale: SupportedLocale; readonly queryClient: QueryClient }) => Promise<unknown>
  readonly Pending: () => JSX.Element | undefined
  readonly Section: AsyncRouteComponent<unknown>
}

export interface AppOverviewArea {
  readonly search: zod.ZodRawShape
  readonly sections: readonly AppOverviewSection[]
}

type Intersection<Union> = (Union extends unknown ? (value: Union) => void : never) extends (value: infer All) => void ? All : never

type AppOverviewSearch = Intersection<(typeof AREA_APP_OVERVIEW)[keyof typeof AREA_APP_OVERVIEW]["search"]>

const AREAS: readonly AppOverviewArea[] = Object.values(AREA_APP_OVERVIEW)

const readsEveryArea = (shape: zod.ZodRawShape): shape is AppOverviewSearch =>
  AREAS.every(({ search }) => Object.entries(search).every(([param, schema]) => shape[param] === schema))

const appOverviewSearch = (): AppOverviewSearch => {
  const shape = Object.fromEntries(AREAS.flatMap(({ search }) => Object.entries(search)))

  if (!readsEveryArea(shape)) {
    throw new Error("Two areas read the same search param on the overview.")
  }

  return shape
}

export const appOverviewSearchSchema = zod.object(appOverviewSearch())

export const APP_OVERVIEW_SECTIONS = AREAS.flatMap(({ sections }) => sections)
