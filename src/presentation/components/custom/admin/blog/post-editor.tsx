import type { JSX } from "react"

import { Maximize2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { ADMIN_BLOG_TOOLBAR_GROUPS } from "~/src/data/admin-blog"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card } from "~/src/presentation/components/shadcn/card"
import { Field, FieldGroup, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

export const PostEditor = (): JSX.Element => {
  const t = useTranslations("pages.admin.blog.create.editor")

  return (
    <FieldGroup className="gap-6 lg:col-span-2">
      <Field>
        <FieldLabel htmlFor="blog-post-title">{t("title")}</FieldLabel>
        <Input
          className="h-12 border-border bg-card px-4 text-lg font-medium shadow-sm"
          id="blog-post-title"
          placeholder={t("titlePlaceholder")}
        />
      </Field>

      <Field>
        <FieldLabel htmlFor="blog-post-slug">{t("slug")}</FieldLabel>
        <div className="flex shadow-sm">
          <span className="inline-flex items-center rounded-l-md border border-r-0 border-border bg-muted/40 px-4 text-muted-foreground sm:text-sm">
            saasyland.com/blog/
          </span>
          <Input className="rounded-l-none border-border bg-card" id="blog-post-slug" placeholder={t("slugPlaceholder")} />
        </div>
      </Field>

      <Card className="flex h-125 flex-col overflow-hidden border-border bg-card">
        <div className="flex flex-wrap items-center gap-1 border-b border-border bg-muted/40 p-2">
          {ADMIN_BLOG_TOOLBAR_GROUPS.map((group, groupIndex) => (
            <div className="flex items-center gap-1" key={group.id}>
              {groupIndex > 0 && <div className="mx-1 h-5 w-px bg-border/40" />}
              {group.tools.map(({ icon: Icon, id }) => (
                <Button className="size-8 text-muted-foreground hover:text-foreground" key={id} size="icon" variant="ghost">
                  <Icon className="size-4" />
                </Button>
              ))}
            </div>
          ))}
          <div className="flex-1" />
          <Button variant="ghost" className="h-8 gap-2 text-muted-foreground hover:text-foreground">
            <Maximize2 className="size-4" />
            <span className="text-sm">{t("fullscreen")}</span>
          </Button>
        </div>
        <Textarea
          className="custom-scrollbar flex-1 resize-none rounded-none border-0 bg-transparent p-6 shadow-none focus-visible:ring-0"
          placeholder={t("contentPlaceholder")}
        />
      </Card>
    </FieldGroup>
  )
}
