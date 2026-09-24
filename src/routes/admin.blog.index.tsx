import type { JSX } from "react"

import { type SearchSchemaInput, createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadRouteMessages, routeHead } from "~/src/integrations/use-intl/i18n.metadata"

import { Tabs, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { BlogAdminStats } from "~/src/presentation/components/custom/admin/blog/components/blog-admin-stats"
import { BlogPostsPanel } from "~/src/presentation/components/custom/admin/blog/components/blog-posts-panel"

const BlogAdminPage = (): JSX.Element => {
  const { view } = Route.useSearch()
  const t = useTranslations("pages.admin.blog")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 pb-8 duration-500 fade-in-50">
      <div className="flex flex-col gap-4">
        <div>
          <h1 className="text-statement font-semibold text-foreground">{t("title")}</h1>
          <p className="text-sm text-muted-foreground">{t("description")}</p>
        </div>
      </div>

      <BlogAdminStats />

      <Tabs defaultSelectedKey="all" className="w-full">
        <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line" className="no-scrollbar flex-1 justify-start gap-6 overflow-x-auto">
            <TabsTrigger id="all" className="flex-none px-0 text-sm">
              {t("filters.all")}
            </TabsTrigger>
            <TabsTrigger id="published" className="flex-none px-0 text-sm">
              {t("filters.published")}
            </TabsTrigger>
            <TabsTrigger id="drafts" className="flex-none px-0 text-sm">
              {t("filters.drafts")}
            </TabsTrigger>
            <TabsTrigger id="scheduled" className="flex-none px-0 text-sm">
              {t("filters.scheduled")}
            </TabsTrigger>
          </TabsList>
        </div>

        <BlogPostsPanel view={view} />
      </Tabs>
    </div>
  )
}

export const Route = createFileRoute("/admin/blog/")({
  component: BlogAdminPage,
  head: routeHead,
  loader: ({ context }) =>
    loadRouteMessages({
      metadataNamespace: "pages.admin.blog",
      namespaces: [
        "auth.errors",
        "auth.validations",
        "pages.admin",
        "pages.admin.blog",
        "pages.admin.blog.create",
        "pages.admin.sidebar",
        "user.validations",
      ],
      pathname: "/admin/blog",
      queryClient: context.queryClient,
    }),
  search: { middlewares: [stripSearchParams({ view: "grid" })] },
  staticData: {
    namespaces: [
      "auth.errors",
      "auth.validations",
      "pages.admin",
      "pages.admin.blog",
      "pages.admin.blog.create",
      "pages.admin.sidebar",
      "user.validations",
    ],
  },
  validateSearch: (search: SearchSchemaInput & { view?: unknown }): { view: "grid" | "table" } => ({
    view: search.view === "table" ? "table" : "grid",
  }),
})
