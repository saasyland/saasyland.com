import type { UseQueryOptions } from "@tanstack/react-query"
import type { LucideIcon } from "lucide-react"

import type { Permission } from "~/src/integrations/better-auth/auth.access"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type { SearchHit } from "~/src/modules/_core/utils/search"

import * as AREA_COMMAND_SEARCHES from "~/src/data/command-search.entries"

export interface CommandSearchInput {
  readonly locale: SupportedLocale
  readonly text: string
}

export interface CommandSearch {
  readonly area: string
  readonly icon: LucideIcon
  readonly key: string
  readonly order: number
  readonly permission: Permission
  readonly query: (input: CommandSearchInput) => UseQueryOptions<readonly SearchHit[], Error, readonly SearchHit[], string[]>
}

const AREAS: Readonly<Record<string, readonly CommandSearch[]>> = AREA_COMMAND_SEARCHES

export const COMMAND_SEARCHES = Object.values(AREAS)
  .flat()
  .toSorted((first, second) => first.order - second.order)
