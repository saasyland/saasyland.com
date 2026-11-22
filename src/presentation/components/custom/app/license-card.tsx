import type { JSX, ReactNode } from "react"

import { CLI_VARIABLE } from "@saasyland/stack/cli"
import { useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { LICENSE_STATUS, type LicenseTier } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { higherTiers } from "~/src/modules/license/license.upgrades"
import { licenseSetupQuery } from "~/src/modules/license/use-cases/get-current-license"
import { licenseKeySetupQuery } from "~/src/modules/license/use-cases/get-current-license-key"

import { useEmailVerification } from "~/src/hooks/use-email-verification"

import { CLI_KEY_LINES, SCAFFOLD_DIR } from "~/src/data/cli"
import { LICENSE_OFFER_ID } from "~/src/data/license"
import { REFUND_TERMS } from "~/src/data/refunds"

import { AnchorButton, buttonVariants } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { CommandLine } from "~/src/presentation/components/custom/app/command-line"

import { CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const LINK_CLASSNAME = "underline underline-offset-4 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"

const CHANGE_TIER_TAGS = {
  email: CONTACT_EMAIL,
  mail: (chunks: ReactNode) => (
    <a className={LINK_CLASSNAME} href={`mailto:${CONTACT_EMAIL}`}>
      {chunks}
    </a>
  ),
}

const CI_TAGS = {
  code: (chunks: ReactNode) => <code className="font-mono text-foreground">{chunks}</code>,
  variable: CLI_VARIABLE.LICENSE_KEY,
}

const AGREEMENT_TAGS = {
  licence: (chunks: ReactNode) => (
    <Link className={LINK_CLASSNAME} to={ROUTES.LICENCE}>
      {chunks}
    </Link>
  ),
}

const ADDRESS_TAGS = { address: (chunks: ReactNode) => <strong className="font-medium wrap-break-word text-foreground">{chunks}</strong> }

const COMMAND_TAGS = {
  days: REFUND_TERMS.WITHDRAWAL_DAYS,
  dir: SCAFFOLD_DIR,
  refunds: (chunks: ReactNode) => (
    <Link className={LINK_CLASSNAME} to={ROUTES.REFUNDS}>
      {chunks}
    </Link>
  ),
}

const InactiveLicense = ({
  status,
}: Readonly<{ status: Exclude<License["select"]["status"], typeof LICENSE_STATUS.ACTIVE> }>): JSX.Element => {
  const t = useTranslations("pages.license")

  return (
    <div className="flex flex-col items-start gap-4">
      <p className="text-sm text-destructive">{t(status)}</p>
      <div className="flex flex-wrap items-center gap-3">
        <AnchorButton href={`#${LICENSE_OFFER_ID}`} size="sm">
          {t("inactive.buyAgain")}
        </AnchorButton>
        <AnchorButton href={`mailto:${CONTACT_EMAIL}`} size="sm" variant="outline">
          {t("inactive.support")}
        </AnchorButton>
      </div>
    </div>
  )
}

const LicenseKey = (): JSX.Element => {
  const tCopy = useTranslations("pages.license.copy")
  const t = useTranslations("pages.license")

  const { key } = useSuspenseQuery(licenseKeySetupQuery).data
  const { unconfirmedEmail } = useEmailVerification()

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{t("issued")}</p>
      {unconfirmedEmail !== undefined && (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-pretty text-muted-foreground">
          {t.rich("keyAwaitsConfirmation", { ...ADDRESS_TAGS, email: unconfirmedEmail })}
        </p>
      )}
      {unconfirmedEmail === undefined && typeof key !== "string" && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner />
          {t("pending")}
        </p>
      )}
      {unconfirmedEmail === undefined && typeof key === "string" && <CommandLine copyLabel={tCopy("key")} isCommand={false} value={key} />}
    </div>
  )
}

const KeyCommands = (): JSX.Element => {
  const tCopy = useTranslations("pages.license.copy")
  const t = useTranslations("pages.license")

  return (
    <>
      <p className="text-sm text-muted-foreground">{t("usage")}</p>
      <dl className="flex flex-col gap-4">
        {CLI_KEY_LINES.map(({ command, id }) => (
          <div className="space-y-1.5" key={id}>
            <dt>
              <CommandLine copyLabel={tCopy("command", { command })} isCommand value={command} />
            </dt>
            <dd className="text-sm text-pretty text-muted-foreground">{t.rich(`commands.${id}`, COMMAND_TAGS)}</dd>
          </div>
        ))}
      </dl>
      <p className="text-sm text-muted-foreground">{t.rich("ci", CI_TAGS)}</p>
    </>
  )
}

const TierChanges = ({ tier }: Readonly<{ tier: LicenseTier }>): JSX.Element => {
  const tTier = useTranslations("components.custom.pricing")
  const t = useTranslations("pages.license")

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-spec text-muted-foreground">
      {higherTiers(tier).map((higher) => (
        <Link className={LINK_CLASSNAME} key={higher} search={{ tier: higher }} to={ROUTES.APP_LICENSE}>
          {t("upgrade.link", { tier: tTier(`tiers.${higher}.name`) })}
        </Link>
      ))}
      <p>{t.rich("changeTier", CHANGE_TIER_TAGS)}</p>
    </div>
  )
}

export const LicenseCard = (): JSX.Element | undefined => {
  const tTier = useTranslations("components.custom.pricing")
  const t = useTranslations("pages.license")

  const { license } = useSuspenseQuery(licenseSetupQuery).data
  const { unconfirmedEmail } = useEmailVerification()

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
        {license.status !== LICENSE_STATUS.ACTIVE && <InactiveLicense status={license.status} />}
        {license.status === LICENSE_STATUS.ACTIVE && <LicenseKey />}
        {license.status === LICENSE_STATUS.ACTIVE && <KeyCommands />}
        <p className="text-spec leading-relaxed text-muted-foreground">{t.rich("agreement", AGREEMENT_TAGS)}</p>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
          {unconfirmedEmail === undefined && (
            <a className={buttonVariants({ size: "sm", variant: "outline" })} href={ROUTES.API_AUTH_CUSTOMER_PORTAL}>
              {t("manage")}
            </a>
          )}
          {license.status === LICENSE_STATUS.ACTIVE && <TierChanges tier={license.tier} />}
        </div>
      </CardContent>
    </Card>
  )
}
