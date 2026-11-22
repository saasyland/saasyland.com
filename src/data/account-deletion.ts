import type { JSX } from "react"

import type { QueryClient } from "@tanstack/react-query"

import * as AREA_ACCOUNT_DELETION from "~/src/data/account-deletion.entries"

export interface AccountDeletionNotice {
  readonly key: string
  readonly load: (context: { readonly queryClient: QueryClient }) => Promise<unknown>
  readonly Notice: () => JSX.Element | undefined
}

const AREAS: Readonly<Record<string, readonly AccountDeletionNotice[]>> = AREA_ACCOUNT_DELETION

export const ACCOUNT_DELETION_NOTICES = Object.values(AREAS).flat()
