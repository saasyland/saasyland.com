import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Field, FieldDescription, FieldGroup, FieldLabel, FieldTitle } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
import { Tabs, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

import { CourseCurriculum } from "~/src/presentation/components/custom/admin/courses/curriculum"

export const CourseDetails = (): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <div className="space-y-6 lg:col-span-2">
      <Card className="p-5 sm:p-6">
        <h2 className="mb-5 text-base font-medium text-foreground">{t("courses.create.sections.general.title")}</h2>
        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="course-name">{t("courses.create.sections.general.name.label")}</FieldLabel>
            <Input id="course-name" placeholder={t("courses.create.sections.general.name.placeholder")} />
          </Field>
          <Field>
            <FieldLabel htmlFor="course-description">{t("courses.create.sections.general.description.label")}</FieldLabel>
            <Textarea
              className="custom-scrollbar resize-none"
              id="course-description"
              placeholder={t("courses.create.sections.general.description.placeholder")}
              rows={4}
            />
            <FieldDescription className="text-xs">{t("courses.create.sections.general.description.help")}</FieldDescription>
          </Field>
        </FieldGroup>
      </Card>

      <CourseCurriculum />

      <Card className="p-5 sm:p-6">
        <h2 className="mb-5 text-base font-medium text-foreground">{t("courses.create.sections.pricing.title")}</h2>
        <FieldGroup className="sm:flex-row sm:items-start">
          <Field className="w-fit">
            <FieldTitle>{t("courses.create.sections.pricing.model.label")}</FieldTitle>
            <Tabs aria-label={t("courses.create.sections.pricing.model.label")} className="w-fit" defaultSelectedKey="subscription">
              <TabsList className="w-fit">
                <TabsTrigger id="onetime">{t("courses.create.sections.pricing.model.oneTime")}</TabsTrigger>
                <TabsTrigger id="subscription">{t("courses.create.sections.pricing.model.subscription")}</TabsTrigger>
              </TabsList>
            </Tabs>
          </Field>
          <Field className="flex-1">
            <FieldLabel htmlFor="course-price">{t("courses.create.sections.pricing.price.label")}</FieldLabel>
            <div className="relative">
              <span className="absolute top-1/2 left-4 -translate-y-1/2 text-sm text-muted-foreground">$</span>
              <Input
                className="pl-8"
                id="course-price"
                placeholder={t("courses.create.sections.pricing.price.placeholder")}
                type="number"
              />
            </div>
          </Field>
          <Field className="flex-1">
            <Select defaultValue="lifetime" fieldLabel={t("courses.create.sections.pricing.duration.label")}>
              <SelectTrigger className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="lifetime">{t("courses.create.sections.pricing.duration.lifetime")}</SelectItem>
                <SelectItem id="1year">{t("labels.oneYearAccess")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </Card>
    </div>
  )
}
