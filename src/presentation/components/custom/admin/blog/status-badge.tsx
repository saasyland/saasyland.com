import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { ADMIN_STATUS_DOT_CLASSES, type AdminStatusColor } from "~/src/data/admin"
import type { DUMMY_POSTS } from "~/src/data/admin-blog"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"

type BlogPostStatus = (typeof DUMMY_POSTS)[number]["status"]

const BLOG_STATUS_COLORS: Record<BlogPostStatus, AdminStatusColor> = {
  draft: "neutral",
  published: "emerald",
  scheduled: "amber",
}

export const StatusBadge = ({ status }: { readonly status: BlogPostStatus }): JSX.Element => {
  const t = useTranslations("pages.admin.blog.badges")

  return (
    <Badge
      className="flex w-fit items-center gap-1.5 rounded-md border-border bg-muted px-2 py-0.5 text-[0.6875rem] font-medium"
      variant="secondary"
    >
      <span aria-hidden className={cn("size-1.5 rounded-full", ADMIN_STATUS_DOT_CLASSES[BLOG_STATUS_COLORS[status]])} />
      {t(status)}
    </Badge>
  )
}
