import type { JSX } from "react"

import { type CellContext, createColumnHelper } from "@tanstack/react-table"
import { Calendar, Eye } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { DUMMY_POSTS } from "~/src/data/admin-blog"

import { AuthorInitials } from "~/src/presentation/components/custom/admin/blog/author-initials"
import { PostDate } from "~/src/presentation/components/custom/admin/blog/post-date"
import { PostViews } from "~/src/presentation/components/custom/admin/blog/post-views"
import { StatusBadge } from "~/src/presentation/components/custom/admin/blog/status-badge"
import { RowActionsCell } from "~/src/presentation/components/custom/admin/row-actions-cell"
import type { DataTableFeatures } from "~/src/presentation/components/custom/data-table"

type BlogPost = (typeof DUMMY_POSTS)[number]

const ColumnHeader = ({ id }: { readonly id: "author" | "category" | "date" | "postDetails" | "status" | "views" }): string => {
  const t = useTranslations("pages.admin.blog.table")

  return t(id)
}

const PostDetailsCell = ({ row }: CellContext<DataTableFeatures, BlogPost, string>): JSX.Element => {
  const t = useTranslations("pages.admin.blog")
  const { id, readTime } = row.original

  return (
    <>
      <div className="max-w-75 cursor-pointer truncate font-medium text-foreground transition-colors duration-200 ease-exp hover:text-muted-foreground">
        {t(`demo.posts.${id}.title`)}
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{readTime === undefined ? "-" : t("meta.readTime", { minutes: readTime })}</div>
    </>
  )
}

const CategoryCell = ({ getValue }: CellContext<DataTableFeatures, BlogPost, string>): JSX.Element => {
  const t = useTranslations("pages.admin.blog.demo.posts")

  return <span className="font-mono text-label text-muted-foreground uppercase">{t(`${getValue()}.category`)}</span>
}

const columnHelper = createColumnHelper<DataTableFeatures, BlogPost>()

export const postColumns = columnHelper.columns([
  columnHelper.accessor("id", {
    cell: PostDetailsCell,
    enableSorting: false,
    header: () => <ColumnHeader id="postDetails" />,
    id: "postDetails",
  }),
  columnHelper.accessor("status", {
    cell: ({ getValue }) => <StatusBadge status={getValue()} />,
    header: () => <ColumnHeader id="status" />,
  }),
  columnHelper.accessor("id", { cell: CategoryCell, enableSorting: false, header: () => <ColumnHeader id="category" />, id: "category" }),
  columnHelper.accessor("author.name", {
    cell: ({ getValue, row }) => (
      <div className="flex items-center gap-2.5">
        <AuthorInitials initials={row.original.author.initials} />
        <span className="text-foreground">{getValue()}</span>
      </div>
    ),
    header: () => <ColumnHeader id="author" />,
    id: "author",
  }),
  columnHelper.accessor("date", {
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {row.original.status === "scheduled" && <Calendar className="size-3.5" />}
        <PostDate post={row.original} />
      </div>
    ),
    header: () => <ColumnHeader id="date" />,
  }),
  columnHelper.accessor("views", {
    cell: ({ getValue }) => {
      const views = getValue()

      return (
        <div className="flex items-center gap-1.5 text-muted-foreground">
          {views === undefined && "-"}
          {views !== undefined && <Eye className="size-3.5" />}
          {views !== undefined && <PostViews views={views} />}
        </div>
      )
    },
    header: () => <ColumnHeader id="views" />,
  }),
  columnHelper.display({ cell: RowActionsCell, header: "", id: "actions" }),
])
