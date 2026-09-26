import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { ADMIN_COURSE_STATUS_TOGGLES } from "~/src/data/admin"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Field, FieldContent, FieldDescription, FieldGroup, FieldSeparator, FieldTitle } from "~/src/presentation/components/shadcn/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
import { Switch } from "~/src/presentation/components/shadcn/switch"

import { MediaUploadZone } from "~/src/presentation/components/custom/admin/media-upload-zone"

export const CourseSidebar = (): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <div className="space-y-6 lg:col-span-1">
      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-base font-medium text-foreground">{t("courses.create.sections.status.title")}</h2>
        <FieldGroup className="gap-4">
          {ADMIN_COURSE_STATUS_TOGGLES.map((toggle, index) => (
            <div className="flex flex-col gap-4" key={toggle.id}>
              {index > 0 && <FieldSeparator />}
              <Field orientation="horizontal">
                <FieldContent>
                  <FieldTitle>{t(`courses.create.sections.status.${toggle.id}.label`)}</FieldTitle>
                  <FieldDescription className="text-xs">{t(`courses.create.sections.status.${toggle.id}.description`)}</FieldDescription>
                </FieldContent>
                <Switch aria-label={t(`courses.create.sections.status.${toggle.id}.label`)} defaultSelected={toggle.defaultSelected} />
              </Field>
            </div>
          ))}
        </FieldGroup>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-5 text-base font-medium text-foreground">{t("courses.create.sections.media.title")}</h2>
        <MediaUploadZone>
          <p className="mb-1 text-sm font-medium text-foreground">{t("courses.create.sections.media.upload")}</p>
          <p className="text-xs text-muted-foreground">{t("courses.create.sections.media.help")}</p>
        </MediaUploadZone>
      </Card>

      <Card className="p-5 sm:p-6">
        <h2 className="mb-4 text-base font-medium text-foreground">{t("courses.create.sections.organization.title")}</h2>
        <FieldGroup className="sm:flex-row">
          <Field className="flex-1">
            <Select
              fieldLabel={t("courses.create.sections.organization.category.label")}
              placeholder={t("courses.create.sections.organization.category.placeholder")}
            >
              <SelectTrigger className="w-full text-muted-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="dev">{t("labels.development")}</SelectItem>
                <SelectItem id="design">{t("labels.design")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field className="flex-1">
            <Select
              fieldLabel={t("courses.create.sections.organization.difficulty.label")}
              placeholder={t("courses.create.sections.organization.difficulty.placeholder")}
            >
              <SelectTrigger className="w-full text-muted-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="beginner">{t("labels.beginner")}</SelectItem>
                <SelectItem id="intermediate">{t("labels.intermediate")}</SelectItem>
                <SelectItem id="advanced">{t("labels.advanced")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
        </FieldGroup>
      </Card>
    </div>
  )
}
