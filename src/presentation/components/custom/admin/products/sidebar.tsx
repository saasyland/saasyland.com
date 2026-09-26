import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldSeparator, FieldTitle } from "~/src/presentation/components/shadcn/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
import { Switch } from "~/src/presentation/components/shadcn/switch"

export const ProductSidebar = (): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <div className="space-y-6 lg:col-span-1">
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-base font-medium text-foreground">{t("products.create.sections.status.title")}</h2>
        <FieldGroup className="gap-4">
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>{t("products.create.sections.status.publish.label")}</FieldTitle>
              <FieldDescription className="text-xs">{t("products.create.sections.status.publish.description")}</FieldDescription>
            </FieldContent>
            <Switch aria-label={t("products.create.sections.status.publish.label")} defaultSelected />
          </Field>
          <FieldSeparator />
          <Field orientation="horizontal">
            <FieldContent>
              <FieldTitle>{t("products.create.sections.status.requireLogin.label")}</FieldTitle>
              <FieldDescription className="text-xs">{t("products.create.sections.status.requireLogin.description")}</FieldDescription>
            </FieldContent>
            <Switch aria-label={t("products.create.sections.status.requireLogin.label")} />
          </Field>
        </FieldGroup>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-base font-medium text-foreground">{t("products.create.sections.organization.title")}</h2>
        <FieldGroup className="sm:flex-row">
          <Field className="flex-1">
            <Select
              fieldLabel={t("products.create.sections.organization.category.label")}
              placeholder={t("products.create.sections.organization.category.placeholder")}
            >
              <SelectTrigger className="w-full text-muted-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="saas">{t("labels.saasPlans")}</SelectItem>
                <SelectItem id="addons">{t("labels.addOns")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field className="flex-1">
            <Select
              fieldLabel={t("products.create.sections.organization.collection.label")}
              placeholder={t("products.create.sections.organization.collection.placeholder")}
            >
              <SelectTrigger className="w-full text-muted-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="core">{t("labels.coreSubscription")}</SelectItem>
                <SelectItem id="legacy">{t("labels.legacy")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </Card>
    </div>
  )
}
