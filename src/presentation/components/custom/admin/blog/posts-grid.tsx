import type { JSX } from "react"

import { Calendar, Eye, MoreHorizontal } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { DUMMY_POSTS } from "~/src/data/admin-blog"

import { Button } from "~/src/presentation/components/shadcn/button"

import { AuthorInitials } from "~/src/presentation/components/custom/admin/blog/author-initials"
import { PostDate } from "~/src/presentation/components/custom/admin/blog/post-date"
import { PostViews } from "~/src/presentation/components/custom/admin/blog/post-views"
import { StatusBadge } from "~/src/presentation/components/custom/admin/blog/status-badge"

export const BlogPostsGrid = (): JSX.Element => {
  const t = useTranslations("pages.admin.blog")

  return (
    <>
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
        {DUMMY_POSTS.map((post) => (
          <article
            className="group flex flex-col rounded-xl border border-border bg-card p-5 transition-colors duration-300 ease-exp hover:border-muted-foreground/25"
            key={post.id}
          >
            <div className="flex items-start justify-between gap-3">
              <StatusBadge status={post.status} />
              <Button
                aria-label={t("labels.moreOptions")}
                className="-mt-1 -mr-1 size-7 text-muted-foreground opacity-0 transition-opacity duration-200 ease-exp group-hover:opacity-100 hover:text-foreground"
                size="icon"
                variant="ghost"
              >
                <MoreHorizontal className="size-4" strokeWidth={1.75} />
              </Button>
            </div>

            <div className="mt-5 flex items-center gap-2.5">
              <span className="font-mono text-label text-muted-foreground uppercase">{t(`demo.posts.${post.id}.category`)}</span>
              {post.views !== undefined && (
                <span className="flex items-center gap-1 font-mono text-[0.6875rem] text-muted-foreground tabular-nums">
                  <Eye aria-hidden className="size-3" strokeWidth={1.75} /> <PostViews views={post.views} />
                </span>
              )}
            </div>

            <h3 className="mt-2 line-clamp-2 cursor-pointer text-title text-balance text-foreground">{t(`demo.posts.${post.id}.title`)}</h3>
            <p className="mt-2 mb-6 line-clamp-2 flex-1 text-body-sm text-pretty text-muted-foreground">
              {t(`demo.posts.${post.id}.description`)}
            </p>

            <div className="mt-auto flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2.5">
                <AuthorInitials initials={post.author.initials} />
                <span className="text-xs text-muted-foreground">{post.author.name}</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                {post.status === "scheduled" && <Calendar className="size-3" />}
                {post.status === "scheduled" && <span>{t("meta.publishesTomorrow")}</span>}
                {post.status === "draft" && <span>{t("meta.lastEdited", { time: t("demo.dates.draft") })}</span>}
                {post.status === "published" && <PostDate post={post} />}
                {post.readTime !== undefined && <span className="size-1 rounded-full bg-border" />}
                {post.readTime !== undefined && <span>{t("meta.readTime", { minutes: post.readTime })}</span>}
              </div>
            </div>
          </article>
        ))}
      </div>

      <div className="flex justify-center pt-4">
        <Button variant="outline" className="flex items-center gap-2">
          {t("actions.loadMore")}
        </Button>
      </div>
    </>
  )
}
