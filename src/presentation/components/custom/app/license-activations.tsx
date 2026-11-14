import type { JSX } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { licenseActivationsQuery } from "~/src/modules/license/use-cases/get-current-license-activations"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { DeactivateActivationButton } from "~/src/presentation/components/custom/app/deactivate-activation-button"

export const LicenseActivations = (): JSX.Element => {
  const t = useTranslations()

  const { activations, limitActivations } = useSuspenseQuery(licenseActivationsQuery).data

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("pages.license.activations.title")}</h2>
        </CardTitle>
        <CardDescription>{t("pages.license.activations.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-xs text-muted-foreground">
          {limitActivations === null && t("pages.license.activations.unlimited", { used: activations.length })}
          {limitActivations !== null && t("pages.license.activations.count", { limit: limitActivations, used: activations.length })}
        </p>
        {activations.length === 0 && <p className="text-sm text-muted-foreground">{t("pages.license.activations.none")}</p>}
        <ul className="flex flex-col divide-y divide-border empty:hidden">
          {activations.map((activation) => (
            <li className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0" key={activation.id}>
              <span className="flex min-w-0 flex-col gap-0.5">
                <span className="text-sm font-medium wrap-anywhere text-foreground">{activation.label}</span>
                <span className="text-xs text-muted-foreground">
                  {t("pages.license.activations.activated", { date: t("common.dateTime", { value: new Date(activation.created_at) }) })}
                </span>
              </span>
              <DeactivateActivationButton activationId={activation.id} />
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  )
}
