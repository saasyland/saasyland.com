import type { JSX } from "react"

import type { QueryClient } from "@tanstack/react-query"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import * as AREA_LICENSE_OFFER from "~/src/data/license-offer.entries"

export interface LicenseOfferSection {
  readonly key: string
  readonly load: (context: { readonly locale: SupportedLocale; readonly queryClient: QueryClient }) => Promise<unknown>
  readonly Pending: () => JSX.Element | undefined
  readonly Section: () => JSX.Element | undefined
}

const AREAS: Readonly<Record<string, readonly LicenseOfferSection[]>> = AREA_LICENSE_OFFER

export const LICENSE_OFFER_SECTIONS = Object.values(AREAS).flat()
