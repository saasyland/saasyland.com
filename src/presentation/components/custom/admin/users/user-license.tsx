import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { LICENSE_ACTIVATION_LIMITS } from "~/src/modules/license/license.constants"
import { refundEligibilityDate } from "~/src/modules/license/license.refunds"
import type { License } from "~/src/modules/license/license.types"
import { userLicenseQuery } from "~/src/modules/license/use-cases/get-user-license"

import { USER_LICENSE_DETAILS } from "~/src/data/license"
import { REFUND_TERMS } from "~/src/data/refunds"

import { Card, CardContent, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

type UserLicenseDetail = (typeof USER_LICENSE_DETAILS)[number]

type LicenseView = NonNullable<License["userLicense"]>

const LicenseDetails = ({ license }: { readonly license: LicenseView }): JSX.Element => {
  const t = useTranslations()

  const dateTime = (value: Date): string => t("common.dateTime", { value })

  const firstTime = (value: License["select"]["activatedAt"]): string => {
    if (value === null) {
      return t("pages.admin.users.license.never")
    }

    return dateTime(value)
  }

  const consent = (value: License["select"]["withdrawalConsentAt"]): string => {
    if (value === null) {
      return t("pages.admin.users.license.consent.notRecorded")
    }

    return t("pages.admin.users.license.consent.given", { date: dateTime(value) })
  }

  const refundTerms = (refund: LicenseView["refund"]): string => {
    if (refund === undefined) {
      return t("pages.admin.users.license.refund.inactive")
    }

    return t(`pages.admin.users.license.refund.${refund.kind}`, {
      date: dateTime(refundEligibilityDate(refund)),
      days: REFUND_TERMS.WITHDRAWAL_DAYS,
    })
  }

  const values: Record<UserLicenseDetail, string> = {
    firstActivation: firstTime(license.activatedAt),
    firstDownload: firstTime(license.deliveredAt),
    machineLimit: t("pages.admin.users.license.machines", { count: LICENSE_ACTIVATION_LIMITS[license.tier] }),
    purchasedAt: dateTime(license.purchaseCreatedAt),
    status: t(`pages.admin.users.license.status.${license.status}`),
    tier: t(`components.custom.pricing.tiers.${license.tier}.name`),
    withdrawalConsent: consent(license.withdrawalConsentAt),
  }

  return (
    <dl className="divide-y divide-border text-sm">
      {USER_LICENSE_DETAILS.map((detail) => (
        <div className="flex items-center justify-between gap-4 py-2.5" key={detail}>
          <dt className="text-muted-foreground">{t(`pages.admin.users.license.details.${detail}`)}</dt>
          <dd className="text-right text-foreground">{values[detail]}</dd>
        </div>
      ))}
      <div className="flex flex-col gap-1 py-2.5">
        <dt className="text-muted-foreground">{t("pages.admin.users.license.details.refund")}</dt>
        <dd className="text-foreground">{refundTerms(license.refund)}</dd>
      </div>
    </dl>
  )
}

const NoLicense = (): JSX.Element => {
  const t = useTranslations("pages.admin.users.license")

  return <p className="text-sm text-muted-foreground">{t("none")}</p>
}

export const UserLicense = ({ userId }: { readonly userId: string }): JSX.Element => {
  const t = useTranslations("pages.admin.users.license")

  const { license } = useSuspenseQuery(userLicenseQuery({ userId })).data

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
      </CardHeader>
      <CardContent>{license === undefined ? <NoLicense /> : <LicenseDetails license={license} />}</CardContent>
    </Card>
  )
}
