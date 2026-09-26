import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { Eye, Save, Send } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"

import { PostEditor } from "~/src/presentation/components/custom/admin/blog/post-editor"
import { PostSettings } from "~/src/presentation/components/custom/admin/blog/post-settings"
import { AdminBlogCreatePending } from "~/src/presentation/components/custom/admin/content-pending"

import { ROUTES } from "~/src/routes"

const BlogCreatePage = (): JSX.Element => {
  const t = useTranslations("pages.admin.blog.create")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 duration-500 fade-in-50">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("metadata.description")}</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" className="h-9 gap-2 px-4 shadow-sm">
            <Eye className="size-4" />
            {t("actions.preview")}
          </Button>
          <Button variant="outline" className="h-9 gap-2 px-4 shadow-sm">
            <Save className="size-4" />
            {t("actions.saveDraft")}
          </Button>
          <Button className="h-9 gap-2 px-4 shadow-sm">
            <Send className="size-4" />
            {t("actions.publish")}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3 lg:gap-8">
        <PostEditor />
        <PostSettings />
      </div>
    </div>
  )
}

const NAMESPACE = "pages.admin.blog.create"

export const Route = createFileRoute("/admin/blog/create")({
  component: BlogCreatePage,
  head: pageHead(ROUTES.ADMIN_BLOG_CREATE),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: AdminBlogCreatePending,
  staticData: { namespaces: [NAMESPACE] },
})
