import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldSeparator, FieldTitle } from "~/src/presentation/components/shadcn/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
import { Switch } from "~/src/presentation/components/shadcn/switch"

export const ProductSidebar = (): JSX.Element => {
  const t = useTranslations("pages.admin.products.create.sections")

  return (
    <div className="space-y-6 lg:col-span-1">
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-base font-medium text-foreground">{t("status.title")}</h2>
        <FieldGroup className="gap-4">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>{t("status.publish.label")}</FieldTitle>
              <FieldDescription className="text-xs">{t("status.publish.description")}</FieldDescription>
            </FieldContent>
            <Switch aria-label={t("status.publish.label")} defaultSelected />
          </Field>
          <FieldSeparator />
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>{t("status.requireLogin.label")}</FieldTitle>
              <FieldDescription className="text-xs">{t("status.requireLogin.description")}</FieldDescription>
            </FieldContent>
            <Switch aria-label={t("status.requireLogin.label")} />
          </Field>
        </FieldGroup>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-base font-medium text-foreground">{t("organization.title")}</h2>
        <FieldGroup className="sm:flex-row">
          <Field className="flex-1">
            <Select fieldLabel={t("organization.category.label")} placeholder={t("organization.category.placeholder")}>
              <SelectTrigger className="w-full text-muted-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="saas">{t("organization.category.options.saas")}</SelectItem>
                <SelectItem id="addons">{t("organization.category.options.addons")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field className="flex-1">
            <Select fieldLabel={t("organization.collection.label")} placeholder={t("organization.collection.placeholder")}>
              <SelectTrigger className="w-full text-muted-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="core">{t("organization.collection.options.core")}</SelectItem>
                <SelectItem id="legacy">{t("organization.collection.options.legacy")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </Card>
    </div>
  )
}
