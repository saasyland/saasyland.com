import type { JSX } from "react"

import type { QueryClient } from "@tanstack/react-query"

import * as AREA_USER_PROFILE from "~/src/data/user-profile.entries"

export interface UserProfileSection {
  readonly key: string
  readonly load: (context: { readonly queryClient: QueryClient; readonly userId: string }) => Promise<unknown>
  readonly Pending: () => JSX.Element
  readonly Section: (props: { readonly userId: string }) => JSX.Element
}

const AREAS: Readonly<Record<string, readonly UserProfileSection[]>> = AREA_USER_PROFILE

export const USER_PROFILE_SECTIONS = Object.values(AREAS).flat()
