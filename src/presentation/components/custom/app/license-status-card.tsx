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

const licenseStatus = (license: License["select"]): "active" | "pending" | "revoked" => {
  if (license.status === LICENSE_STATUS.REVOKED) {
    return "revoked"
  }

  if (typeof license.key === "string" && license.key.length > 0) {
    return "active"
  }

  return "pending"
}

export const LicenseStatusCard = (): JSX.Element | undefined => {
  const t = useTranslations("pages")
  const { license } = useSuspenseQuery(currentLicenseQuery).data

  if (license === undefined) {
    return undefined
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("app.overview.license.title")}</h2>
        </CardTitle>
        <CardDescription>{t("app.overview.license.description")}</CardDescription>
        <CardAction>
          <Badge variant={license.status === LICENSE_STATUS.REVOKED ? "destructive" : "secondary"}>
            {t(`app.overview.license.${licenseStatus(license)}`)}
          </Badge>
        </CardAction>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-lg font-semibold text-foreground">{t(`license.tier.${license.tier}`)}</p>
        <LinkButton href={ROUTES.APP_LICENSE} size="sm" variant="outline">
          {t("app.license")}
        </LinkButton>
      </CardContent>
    </Card>
  )
}
