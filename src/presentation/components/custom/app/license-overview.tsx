import type { JSX } from "react"

import { type QueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import { currentLicenseKeyQuery } from "~/src/modules/license/use-cases/get-current-license-key"

import { CheckoutActivation } from "~/src/presentation/components/custom/app/checkout-activation"
import { ChosenTier } from "~/src/presentation/components/custom/app/chosen-tier"
import { GetStarted } from "~/src/presentation/components/custom/app/get-started"
import { LicenseOffer } from "~/src/presentation/components/custom/app/license-offer"
import { LicenseStatusCard } from "~/src/presentation/components/custom/app/license-status-card"
import { UpgradeOffer } from "~/src/presentation/components/custom/app/upgrade-offer"

const route = getRouteApi("/app/")

export const loadLicenseOverview = ({
  locale,
  queryClient,
}: {
  readonly locale: SupportedLocale
  readonly queryClient: QueryClient
}): Promise<unknown> =>
  Promise.all([
    queryClient.query({ ...currentLicenseQuery, staleTime: "static" }),
    queryClient.query({ ...currentLicenseKeyQuery, staleTime: "static" }),
    queryClient.query(catalogueQuery({ locale })),
  ])

export const LicenseOverview = (): JSX.Element => {
  const { checkoutId, tier } = route.useSearch()

  const { license } = useSuspenseQuery(currentLicenseQuery).data

  const hasActiveLicense = license?.status === LICENSE_STATUS.ACTIVE
  const isBuying = checkoutId === undefined && !hasActiveLicense
  const isUpgrading = checkoutId === undefined && hasActiveLicense && tier !== undefined
  const showsLicense = license !== undefined && (hasActiveLicense || checkoutId === undefined)

  return (
    <>
      {checkoutId !== undefined && <CheckoutActivation checkoutId={checkoutId} tier={tier} />}
      {isBuying && tier !== undefined && <ChosenTier tier={tier} />}
      {isUpgrading && <UpgradeOffer tier={tier} />}
      {showsLicense && <LicenseStatusCard />}
      {showsLicense && checkoutId === undefined && <GetStarted />}
      {isBuying && <LicenseOffer />}
    </>
  )
}
