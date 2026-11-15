import type { JSX, ReactNode } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { CLI_LICENSE_COMMANDS, CLI_LICENSE_KEY_VARIABLE, cliCommand } from "~/src/data/cli"

import { buttonVariants } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const CHANGE_TIER_TAGS = {
  email: CONTACT_EMAIL,
  mail: (chunks: ReactNode) => (
    <a
      className="underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
      href={`mailto:${CONTACT_EMAIL}`}
    >
      {chunks}
    </a>
  ),
}

const CI_TAGS = {
  code: (chunks: ReactNode) => <code className="font-mono text-foreground">{chunks}</code>,
  variable: CLI_LICENSE_KEY_VARIABLE,
}

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
  const tTier = useTranslations("components.custom.pricing")
  const t = useTranslations("pages.license")

  const { license } = useSuspenseQuery(currentLicenseQuery).data

  if (license === undefined) {
    return undefined
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{tTier(`tiers.${license.tier}.name`)}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {license.status === LICENSE_STATUS.REVOKED && <p className="text-sm text-destructive">{t("revoked")}</p>}
        {license.status === LICENSE_STATUS.REFUNDED && <p className="text-sm text-destructive">{t("refunded")}</p>}
        <div className="space-y-2">
          <p className="text-sm font-medium">{t("issued")}</p>
          <code className="block rounded-md border border-border bg-muted px-4 py-3 font-mono text-sm break-all select-all">
            {license.key ?? t("pending")}
          </code>
        </div>
        <p className="text-sm text-muted-foreground">{t("usage")}</p>
        <dl className="flex flex-col gap-3">
          {CLI_LICENSE_COMMANDS.map((command) => (
            <div className="space-y-1.5" key={command}>
              <dt>
                <code className="block overflow-x-auto rounded-md border border-border bg-muted px-4 py-3 font-mono text-sm select-all">
                  {cliCommand(command)}
                </code>
              </dt>
              <dd className="text-sm text-muted-foreground">{t(`commands.${command}`)}</dd>
            </div>
          ))}
        </dl>
        <p className="text-sm text-muted-foreground">{t.rich("ci", CI_TAGS)}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">{t.rich("agreement", AGREEMENT_TAGS)}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          <a className={buttonVariants({ size: "sm", variant: "outline" })} href={ROUTES.API_AUTH_CUSTOMER_PORTAL}>
            {t("manage")}
          </a>
          <p className="text-xs text-muted-foreground">{t.rich("changeTier", CHANGE_TIER_TAGS)}</p>
        </div>
      </CardContent>
    </Card>
  )
}
