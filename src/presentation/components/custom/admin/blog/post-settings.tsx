import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Card } from "~/src/presentation/components/shadcn/card"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

import { MediaUploadZone } from "~/src/presentation/components/custom/admin/media-upload-zone"

const SETTINGS_LABEL_CLASSNAME = "font-mono text-label text-muted-foreground uppercase"

export const PostSettings = (): JSX.Element => {
  const t = useTranslations("pages.admin.blog.create.settings")

  return (
    <div className="space-y-6 lg:col-span-1">
      <Card className="border-border p-5 sm:p-6">
        <h3 className="mb-4 text-sm font-medium text-foreground">{t("featuredImage")}</h3>
        <MediaUploadZone>
          <p className="mb-1 text-sm font-medium text-foreground">{t("upload")}</p>
          <p className="text-xs text-muted-foreground">{t("uploadHelp")}</p>
        </MediaUploadZone>
      </Card>

      <Card className="border-border p-5 sm:p-6">
        <h3 className="mb-4 text-sm font-medium text-foreground">{t("publishing")}</h3>
        <FieldGroup className="gap-4">
          <Field>
            <Select defaultValue="draft" fieldLabel={t("status")} fieldLabelClassName={SETTINGS_LABEL_CLASSNAME}>
              <SelectTrigger className="w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="draft">{t("statusDraft")}</SelectItem>
                <SelectItem id="published">{t("statusPublished")}</SelectItem>
                <SelectItem id="scheduled">{t("statusScheduled")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <Select fieldLabel={t("category")} fieldLabelClassName={SETTINGS_LABEL_CLASSNAME} placeholder={t("categorySelect")}>
              <SelectTrigger className="w-full bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem id="updates">{t("categoryUpdates")}</SelectItem>
                <SelectItem id="tutorials">{t("categoryTutorials")}</SelectItem>
                <SelectItem id="company">{t("categoryCompany")}</SelectItem>
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel className={SETTINGS_LABEL_CLASSNAME} htmlFor="blog-post-tags">
              {t("tags")}
            </FieldLabel>
            <Input className="bg-card" id="blog-post-tags" placeholder={t("tagsPlaceholder")} />
          </Field>
          <Field>
            <FieldLabel className={SETTINGS_LABEL_CLASSNAME} htmlFor="blog-post-excerpt">
              {t("excerpt")}
            </FieldLabel>
            <Textarea
              className="custom-scrollbar min-h-24 resize-none bg-card"
              id="blog-post-excerpt"
              placeholder={t("excerptPlaceholder")}
            />
          </Field>
        </FieldGroup>
      </Card>
    </div>
  )
}
