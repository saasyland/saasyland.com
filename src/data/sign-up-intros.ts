import type { JSX } from "react"

import * as AREA_SIGN_UP_INTROS from "~/src/data/sign-up-intros.entries"

export interface SignUpIntro {
  readonly appliesTo: (redirect: string | undefined) => boolean
  readonly Intro: (props: Readonly<{ redirect: string | undefined }>) => JSX.Element
  readonly key: string
  readonly Pending: () => JSX.Element
}

const AREAS: Readonly<Record<string, readonly SignUpIntro[]>> = AREA_SIGN_UP_INTROS

export const SIGN_UP_INTROS = Object.values(AREAS).flat()

export const findSignUpIntro = (redirect: string | undefined): SignUpIntro | undefined =>
  SIGN_UP_INTROS.find(({ appliesTo }) => appliesTo(redirect))
