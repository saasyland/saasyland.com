import type { JSX, ReactNode } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { buttonVariants } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { ROUTES } from "~/src/routes"

const INSTALL_COMMAND = "npx saasyland@latest init"

const AGREEMENT_TAGS = {
  licence: (chunks: ReactNode) => (
    <Link
      className="underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      to={ROUTES.LICENCE}
    >
      {chunks}
    </Link>
  ),
}

export const LicenseCard = (): JSX.Element | undefined => {
  const t = useTranslations("pages.license")
  const { license } = useSuspenseQuery(currentLicenseQuery).data

  if (license === undefined) {
    return undefined
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t(`tier.${license.tier}`)}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {license.status === LICENSE_STATUS.REVOKED && <p className="text-sm text-destructive">{t("revoked")}</p>}
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("issued")}</p>
          <code className="block rounded-md border border-border bg-muted px-4 py-3 font-mono text-sm break-all select-all">
            {license.key ?? t("pending")}
          </code>
        </div>
        <p className="text-sm text-muted-foreground">{t("usage")}</p>
        <code className="block overflow-x-auto rounded-md border border-border bg-muted px-4 py-3 font-mono text-sm select-all">
          {INSTALL_COMMAND}
        </code>
        <p className="text-xs leading-relaxed text-muted-foreground">{t.rich("agreement", AGREEMENT_TAGS)}</p>
        <div>
          <a className={buttonVariants({ size: "sm", variant: "outline" })} href={ROUTES.API_AUTH_CUSTOMER_PORTAL}>
            {t("manage")}
          </a>
        </div>
      </CardContent>
    </Card>
  )
}
