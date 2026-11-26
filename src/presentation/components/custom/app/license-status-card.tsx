import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { Badge, type BadgeVariant } from "~/src/presentation/components/shadcn/badge"
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

const STATUS_BADGES: Record<ReturnType<typeof licenseStatus>, BadgeVariant> = {
  [LICENSE_STATUS.ACTIVE]: "accent",
  [LICENSE_STATUS.REFUNDED]: "destructive",
  [LICENSE_STATUS.REVOKED]: "destructive",
  pending: "warning",
}

export const LicenseStatusCard = (): JSX.Element | undefined => {
  const t = useTranslations()

  const { license } = useSuspenseQuery(currentLicenseQuery).data

  if (license === undefined) {
    return
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("pages.license.statusCard.title")}</h2>
        </CardTitle>
        <CardDescription>{t("pages.license.statusCard.description")}</CardDescription>
        <CardAction>
          <Badge variant={STATUS_BADGES[licenseStatus(license)]}>{t(`pages.license.statusCard.${licenseStatus(license)}`)}</Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg font-semibold text-foreground">{t(`components.custom.pricing.tiers.${license.tier}.name`)}</p>
        <LinkButton to={ROUTES.APP.LICENSE} size="sm" variant="outline">
          {t("pages.license.statusCard.action")}
        </LinkButton>
      </CardContent>
    </Card>
  )
}
