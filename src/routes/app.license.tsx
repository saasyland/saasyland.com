import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { currentLicenseQuery, licenseActivationsQuery } from "~/src/modules/license/use-cases/get-current-license"

import { pageHead } from "~/src/lib/seo"

import { AppLicensePending } from "~/src/presentation/components/custom/app/app-pending"
import { CheckoutOptions } from "~/src/presentation/components/custom/app/checkout-options"
import { LicenseActivations } from "~/src/presentation/components/custom/app/license-activations"
import { LicenseCard } from "~/src/presentation/components/custom/app/license-card"

import { ROUTES } from "~/src/routes"

const LicensePage = (): JSX.Element => {
  const t = useTranslations("pages.license")
  const { license } = useSuspenseQuery(currentLicenseQuery).data

  return (
    <div className="flex w-full flex-col gap-8 pb-8">
      <header className="flex flex-col gap-1">
        <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("metadata.description")}</p>
      </header>
      {license === undefined && <CheckoutOptions />}
      {license !== undefined && (
        <>
          <LicenseCard />
          {license.polarLicenseKeyId !== null && <LicenseActivations />}
        </>
      )}
      <Link
        className="w-fit text-sm font-medium text-muted-foreground underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        to={ROUTES.APP}
      >
        {t("back")}
      </Link>
    </div>
  )
}

const NAMESPACE = "pages.license"

export const Route = createFileRoute("/app/license")({
  component: LicensePage,
  head: pageHead(ROUTES.APP_LICENSE),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
      context.queryClient.query({ ...currentLicenseQuery, staleTime: "static" }),
      context.queryClient.query({ ...licenseActivationsQuery, staleTime: "static" }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AppLicensePending,
  staticData: { namespaces: [NAMESPACE] },
})
