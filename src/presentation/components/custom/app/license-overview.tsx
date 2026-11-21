import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { getRouteApi } from "@tanstack/react-router"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { CheckoutActivation } from "~/src/presentation/components/custom/app/checkout-activation"
import { ChosenTier } from "~/src/presentation/components/custom/app/chosen-tier"
import { GetStarted } from "~/src/presentation/components/custom/app/get-started"
import { LicenseOffer } from "~/src/presentation/components/custom/app/license-offer"
import { LicenseStatusCard } from "~/src/presentation/components/custom/app/license-status-card"

const route = getRouteApi("/app/")

export const LicenseOverview = (): JSX.Element => {
  const { checkoutId, tier } = route.useSearch()

  const { license } = useSuspenseQuery(currentLicenseQuery).data

  const hasActiveLicense = license?.status === LICENSE_STATUS.ACTIVE
  const isBuying = checkoutId === undefined && !hasActiveLicense
  const showsLicense = license !== undefined && (hasActiveLicense || checkoutId === undefined)

  return (
    <>
      {checkoutId !== undefined && <CheckoutActivation checkoutId={checkoutId} />}
      {isBuying && tier !== undefined && <ChosenTier tier={tier} />}
      {showsLicense && <LicenseStatusCard />}
      {showsLicense && checkoutId === undefined && <GetStarted />}
      {isBuying && <LicenseOffer />}
    </>
  )
}
