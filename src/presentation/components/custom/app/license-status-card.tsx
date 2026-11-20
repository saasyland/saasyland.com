import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { LinkButton } from "~/src/presentation/components/shadcn/button"
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { ROUTES } from "~/src/routes"

const licenseStatus = (license: Pick<License["select"], "polarLicenseKeyId" | "status">): License["select"]["status"] | "pending" => {
  if (license.status !== LICENSE_STATUS.ACTIVE) {
    return license.status
  }

  if (typeof license.polarLicenseKeyId === "string" && license.polarLicenseKeyId.length > 0) {
    return LICENSE_STATUS.ACTIVE
  }

  return "pending"
}

export const LicenseStatusCard = (): JSX.Element | undefined => {
  const tTier = useTranslations("components.custom.pricing")
  const t = useTranslations("pages.license.statusCard")

  const { license } = useSuspenseQuery(currentLicenseQuery).data

  if (license === undefined) {
    return undefined
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
        <CardAction>
          <Badge variant={license.status === LICENSE_STATUS.ACTIVE ? "secondary" : "destructive"}>{t(licenseStatus(license))}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg font-semibold text-foreground">{tTier(`tiers.${license.tier}.name`)}</p>
        <LinkButton href={ROUTES.APP_LICENSE} size="sm" variant="outline">
          {t("action")}
        </LinkButton>
      </CardContent>
    </Card>
  )
}
