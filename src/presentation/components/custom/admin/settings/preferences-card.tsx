import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import type { TimezoneCode } from "~/src/modules/_core/constants/timezone"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldTitle } from "~/src/presentation/components/shadcn/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
import { Switch } from "~/src/presentation/components/shadcn/switch"

const PREFERENCE_TIMEZONES = [
  "UTC",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Warsaw",
] as const satisfies readonly TimezoneCode[]

export const PreferencesCard = (): JSX.Element => {
  const t = useTranslations()

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border p-5">
        <CardTitle className="mb-1 text-base font-medium text-foreground">{t("pages.admin.settings.preferences.title")}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{t("pages.admin.settings.preferences.description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 p-5">
        <FieldGroup className="gap-6">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field>
              <Select
                defaultValue={I18N.DEFAULT_LOCALE}
                fieldLabel={t("pages.admin.settings.preferences.language")}
                fieldLabelClassName="text-xs"
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {I18N.SUPPORTED_LOCALES.map((code) => (
                    <SelectItem id={code} key={code}>
                      {t(`locales.${code}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field>
              <Select
                defaultValue={I18N.DEFAULT_TIMEZONE}
                fieldLabel={t("pages.admin.settings.preferences.timezone")}
                fieldLabelClassName="text-xs"
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PREFERENCE_TIMEZONES.map((timezone) => (
                    <SelectItem id={timezone} key={timezone}>
                      {t(`timezones.${timezone}`)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <Field className="py-2" orientation="horizontal">
            <FieldContent>
              <FieldTitle>{t("pages.admin.settings.preferences.announcements.title")}</FieldTitle>
              <FieldDescription className="text-xs">{t("pages.admin.settings.preferences.announcements.description")}</FieldDescription>
            </FieldContent>
            <Switch aria-label={t("pages.admin.settings.preferences.announcements.title")} defaultSelected />
          </Field>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
