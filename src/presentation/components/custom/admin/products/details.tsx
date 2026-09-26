import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
import { Tabs, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

import { MediaUploadZone } from "~/src/presentation/components/custom/admin/media-upload-zone"

export const ProductDetails = (): JSX.Element => {
  const t = useTranslations("pages.admin.products.create.sections")

  return (
    <div className="space-y-6 lg:col-span-2">
      <Card className="p-5 sm:p-6">
        <h2 className="mb-5 text-base font-medium text-foreground">{t("general.title")}</h2>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="product-name">{t("general.name.label")}</FieldLabel>
            <Input id="product-name" placeholder={t("general.name.placeholder")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="product-description">{t("general.description.label")}</FieldLabel>
            <Textarea
              className="custom-scrollbar min-h-30 resize-none"
              id="product-description"
              placeholder={t("general.description.placeholder")}
              rows={4}
            />
            <FieldDescription className="text-xs">{t("general.description.help")}</FieldDescription>
          </Field>
        </FieldGroup>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-5 text-base font-medium text-foreground">{t("pricing.title")}</h2>
        <FieldGroup className="sm:flex-row sm:items-start">
          <Field className="w-fit">
            <FieldTitle>{t("pricing.model.label")}</FieldTitle>
            <Tabs aria-label={t("pricing.model.label")} className="w-fit" defaultSelectedKey="subscription">
              <TabsList className="w-fit">
                <TabsTrigger id="subscription">{t("pricing.model.subscription")}</TabsTrigger>
                <TabsTrigger id="onetime">{t("pricing.model.oneTime")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </Field>
          <Field className="flex-1">
            <FieldLabel htmlFor="product-price">{t("pricing.price.label")}</FieldLabel>
            <div className="relative">
              <span className="absolute top-1/2 left-3 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input className="pl-7" id="product-price" placeholder={t("pricing.price.placeholder")} type="number" />
            </div>
          </Field>
          <Field className="flex-1">
            <Select defaultValue="monthly" fieldLabel={t("pricing.period.label")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="monthly">{t("pricing.period.monthly")}</SelectItem>
                <SelectItem id="yearly">{t("pricing.period.yearly")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-5 text-base font-medium text-foreground">{t("media.title")}</h2>
        <MediaUploadZone>
          <p className="mb-1 text-sm font-medium text-foreground">{t("media.upload")}</p>
          <p className="text-xs text-muted-foreground">{t("media.help")}</p>
        </MediaUploadZone>
      </Card>
    </div>
  )
}
