import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { licenseSearchSchema } from "~/src/modules/license/license.zod"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"
import { licenseActivationsQuery } from "~/src/modules/license/use-cases/get-current-license-activations"
import { currentLicenseKeyQuery } from "~/src/modules/license/use-cases/get-current-license-key"
import { withdrawalContractQuery } from "~/src/modules/withdrawal/use-cases/get-withdrawal-contract"

import { onlyDeclaredSearch } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { CheckoutActivation } from "~/src/presentation/components/custom/app/checkout-activation"
import { ChosenTier } from "~/src/presentation/components/custom/app/chosen-tier"
import { LicenseActivations } from "~/src/presentation/components/custom/app/license-activations"
import { LicenseCard } from "~/src/presentation/components/custom/app/license-card"
import { LicenseOffer } from "~/src/presentation/components/custom/app/license-offer"
import { AppLicensePending } from "~/src/presentation/components/custom/app/license-pending"
import { UpgradeOffer } from "~/src/presentation/components/custom/app/upgrade-offer"
import { WithdrawalCard } from "~/src/presentation/components/custom/app/withdrawal-card"

import { ROUTES } from "~/src/routes"

const hasIssuedKey = <Licence extends Pick<License["select"], "polarLicenseKeyId" | "status">>(
  license: Licence | undefined,
): license is Licence & { polarLicenseKeyId: string } => license?.status === LICENSE_STATUS.ACTIVE && license.polarLicenseKeyId !== null

const LicensePage = (): JSX.Element => {
  const t = useTranslations("pages.license")

  const { checkoutId, tier } = Route.useSearch()

  const { license } = useSuspenseQuery(currentLicenseQuery).data

  const hasActiveLicense = license?.status === LICENSE_STATUS.ACTIVE
  const isBuying = checkoutId === undefined && !hasActiveLicense
  const isUpgrading = checkoutId === undefined && hasActiveLicense && tier !== undefined
  const showsLicense = license !== undefined && (hasActiveLicense || checkoutId === undefined)

  return (
    <div className="flex w-full flex-col gap-8 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("metadata.description")}</p>
      </header>
      {checkoutId !== undefined && <CheckoutActivation checkoutId={checkoutId} tier={tier} />}
      {isBuying && tier !== undefined && <ChosenTier tier={tier} />}
      {isUpgrading && <UpgradeOffer tier={tier} />}
      {showsLicense && <LicenseCard />}
      {hasIssuedKey(license) && <LicenseActivations polarLicenseKeyId={license.polarLicenseKeyId} tier={license.tier} />}
      {hasActiveLicense && <WithdrawalCard />}
      {isBuying && <LicenseOffer />}
      <Link
        className="w-fit text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        to={ROUTES.APP.INDEX}
      >
        {t("back")}
      </Link>
    </div>
  )
}

const NAMESPACE = "pages.license"

export const Route = createFileRoute("/app/license")({
  validateSearch: licenseSearchSchema,
  component: LicensePage,
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...currentLicenseQuery, staleTime: "static" }).then(async ({ license }) => {
        if (hasIssuedKey(license)) {
          await context.queryClient.query({ ...licenseActivationsQuery(license), staleTime: "static" })
        }
      }),
      context.queryClient.query({ ...currentLicenseQuery, staleTime: "static" }).then(async ({ license }) => {
        if (license?.status === LICENSE_STATUS.ACTIVE) {
          await context.queryClient.query({ ...withdrawalContractQuery, staleTime: "static" })
        }
      }),
      context.queryClient.query({ ...currentLicenseKeyQuery, staleTime: "static" }),
      context.queryClient.query(catalogueQuery({ locale })),
    ])
    return { locale, metadata }
  },
  head: pageHead(ROUTES.APP.LICENSE),
  pendingComponent: AppLicensePending,
  search: { middlewares: [onlyDeclaredSearch(licenseSearchSchema)] },
  staticData: { namespaces: [NAMESPACE] },
})
