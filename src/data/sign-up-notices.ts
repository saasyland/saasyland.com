import type { JSX } from "react"

import * as AREA_SIGN_UP_NOTICES from "~/src/data/sign-up-notices.entries"

export interface SignUpNotice {
  readonly key: string
  readonly Notice: () => JSX.Element
  readonly Pending: () => JSX.Element
}

const AREAS: Readonly<Record<string, readonly SignUpNotice[]>> = AREA_SIGN_UP_NOTICES

export const SIGN_UP_NOTICES = Object.values(AREAS).flat()
