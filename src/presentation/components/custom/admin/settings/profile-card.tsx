import type { JSX } from "react"

import { ImageIcon } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { APP_NAME } from "~/src/presentation/branding"

const SUPPORT_EMAIL = "support@saasyland.com"

const WORKSPACE_SLUG = "hq"

export const ProfileCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.profile")

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b border-border p-5">
        <CardTitle className="mb-1 text-base font-medium text-foreground">{t("title")}</CardTitle>
        <CardDescription className="text-xs text-muted-foreground">{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="flex-1 space-y-6 p-5">
        <div className="flex items-center gap-6">
          <div className="flex size-16 shrink-0 items-center justify-center rounded-xl border border-border bg-secondary shadow-inner">
            <ImageIcon className="size-6 text-muted-foreground" />
          </div>
          <div>
            <div className="mb-2 flex gap-3">
              <Button size="sm" className="h-8 px-3 text-xs">
                {t("uploadImage")}
              </Button>
              <Button variant="outline" size="sm" className="h-8 px-3 text-xs">
                {t("removeImage")}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">{t("imageHint")}</p>
          </div>
        </div>

        <FieldGroup className="gap-4">
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Field>
              <FieldLabel className="text-xs" htmlFor="workspace-name">
                {t("workspaceName")}
              </FieldLabel>
              <Input defaultValue={APP_NAME} id="workspace-name" />
            </Field>
            <Field>
              <FieldLabel className="text-xs" htmlFor="workspace-support-email">
                {t("supportEmail")}
              </FieldLabel>
              <Input defaultValue={SUPPORT_EMAIL} id="workspace-support-email" type="email" />
            </Field>
          </div>
          <Field>
            <FieldLabel className="text-xs" htmlFor="workspace-url">
              {t("workspaceUrl")}
            </FieldLabel>
            <div className="flex">
              <span className="inline-flex items-center rounded-l-lg border border-r-0 border-input bg-muted px-3 text-sm text-muted-foreground">
                {t("urlPrefix")}
              </span>
              <Input className="rounded-l-none" defaultValue={WORKSPACE_SLUG} id="workspace-url" />
            </div>
            <FieldDescription className="text-xs">{t("urlHint")}</FieldDescription>
          </Field>
        </FieldGroup>
      </CardContent>
      <div className="flex justify-end border-t border-border bg-muted/40 p-4">
        <Button size="sm" className="h-8 px-4 text-xs shadow-sm">
          {t("saveChanges")}
        </Button>
      </div>
    </Card>
  )
}
