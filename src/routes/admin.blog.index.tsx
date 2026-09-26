import type { JSX } from "react"

import { Link, type SearchSchemaInput, createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { FileEdit, FolderOpen, Search } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { ADMIN_BLOG_FILTERS, ADMIN_BLOG_VIEWS, DUMMY_POSTS } from "~/src/data/admin-blog"

import { cn } from "~/src/lib/cn"
import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"

import { postColumns } from "~/src/presentation/components/custom/admin/blog/post-columns"
import { BlogPostsGrid } from "~/src/presentation/components/custom/admin/blog/posts-grid"
import { BlogStats } from "~/src/presentation/components/custom/admin/blog/stats"
import { AdminBlogPending } from "~/src/presentation/components/custom/admin/content-pending"
import { DataTable } from "~/src/presentation/components/custom/data-table"

import { ROUTES } from "~/src/routes"

const BlogPage = (): JSX.Element => {
  const { view } = Route.useSearch()
  const t = useTranslations("pages.admin.blog")

  return (
    <div className="flex w-full animate-in flex-col space-y-8 pb-8 duration-500 fade-in-50">
      <div>
        <h1 className="text-statement font-semibold text-foreground">{t("metadata.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("metadata.description")}</p>
      </div>

      <BlogStats />

      <Tabs defaultSelectedKey="all" className="w-full">
        <div className="flex flex-col gap-4 border-b border-border sm:flex-row sm:items-center sm:justify-between">
          <TabsList variant="line" className="no-scrollbar flex-1 justify-start gap-6 overflow-x-auto">
            {ADMIN_BLOG_FILTERS.map((filter) => (
              <TabsTrigger className="flex-none px-0 text-sm" id={filter} key={filter}>
                {t(`filters.${filter}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>

        <TabsContent id="all" className="mt-6 space-y-4 outline-none">
          <div className="flex flex-col gap-3 sm:flex-row">
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="h-10 gap-2 whitespace-nowrap">
                <FolderOpen className="size-4 text-muted-foreground" />
                {t("actions.categories")}
              </Button>
              <div className="flex items-center gap-1 rounded-md border border-border bg-muted/40 p-1">
                {ADMIN_BLOG_VIEWS.map(({ icon: Icon, id, labelKey }) => (
                  <Link
                    className={cn("flex h-7 w-7 items-center justify-center rounded-sm transition-colors", {
                      "bg-background shadow-sm": view === id,
                      "text-muted-foreground hover:text-foreground": view !== id,
                    })}
                    key={id}
                    search={{ view: id }}
                    title={t(labelKey)}
                    to={ROUTES.ADMIN_BLOG}
                  >
                    <Icon className="size-4" />
                  </Link>
                ))}
              </div>
            </div>

            <div className="group relative flex-1">
              <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground" />
              <Input aria-label={t("filters.search")} placeholder={t("filters.search")} className="h-10 w-full pl-10" />
            </div>

            <Link to={ROUTES.ADMIN_BLOG_CREATE} className="shrink-0">
              <Button size="sm" className="h-10 w-full gap-2 sm:w-auto">
                <FileEdit className="size-4" />
                {t("actions.writePost")}
              </Button>
            </Link>
          </div>

          {view === "grid" && <BlogPostsGrid />}
          {view === "table" && <DataTable columns={postColumns} data={DUMMY_POSTS} options={{ selectable: true }} />}
        </TabsContent>
      </Tabs>
    </div>
  )
}

const NAMESPACE = "pages.admin.blog"

export const Route = createFileRoute("/admin/blog/")({
  component: BlogPage,
  head: pageHead(ROUTES.ADMIN_BLOG),
  validateSearch: (search: SearchSchemaInput & { view?: unknown }): { view: "grid" | "table" } => ({
    view: search.view === "table" ? "table" : "grid",
  }),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  search: { middlewares: [stripSearchParams({ view: "grid" })] },
  pendingComponent: AdminBlogPending,
  staticData: { namespaces: [NAMESPACE] },
})
