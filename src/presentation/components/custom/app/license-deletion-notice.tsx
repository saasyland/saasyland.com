import type { JSX, ReactNode } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import * as ROUTES from "~/src/routes"

const NOTICE_TAGS = {
  strong: (chunks: ReactNode) => <strong className="font-medium text-foreground">{chunks}</strong>,
  withdrawal: (chunks: ReactNode) => (
    <Link className="text-foreground underline underline-offset-4 hover:text-muted-foreground" to={ROUTES.WITHDRAWAL}>
      {chunks}
    </Link>
  ),
}

export const LicenseDeletionNotice = (): JSX.Element | undefined => {
  const t = useTranslations()

  const { license } = useSuspenseQuery(currentLicenseQuery).data

  if (license?.status !== LICENSE_STATUS.ACTIVE) {
    return
  }

  return <li>{t.rich("pages.license.deletion", { ...NOTICE_TAGS, tier: t(`components.custom.pricing.tiers.${license.tier}.name`) })}</li>
}
