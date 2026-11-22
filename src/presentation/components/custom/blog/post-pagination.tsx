import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { ArrowLeft, ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { blogArchivePath } from "~/src/integrations/fumadocs/fumadocs.blog"

import { CTA_CLASSES } from "~/src/data/cta"

import { cn } from "~/src/lib/cn"

const ICON_CLASSNAME = "size-3.5 text-muted-foreground transition-transform duration-200 ease-exp motion-reduce:transition-none"

interface PostPaginationProps {
  readonly page: number
  readonly pages: number
}

export const PostPagination = ({ page, pages }: PostPaginationProps): JSX.Element => {
  const t = useTranslations("pages.blog.archive")

  return (
    <nav aria-label={t("pagination")} className="mt-10 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
      <div>
        <Link className={CTA_CLASSES.SECONDARY} rel="prev" to={blogArchivePath(page - 1)}>
          <ArrowLeft aria-hidden className={cn(ICON_CLASSNAME, "group-hover:-translate-x-0.5")} strokeWidth={2} />
          {t("newer")}
        </Link>
      </div>
      <p className="text-spec text-muted-foreground tabular-nums">{t("pageOf", { page, pages })}</p>
      <div className="flex justify-end">
        {page < pages && (
          <Link className={CTA_CLASSES.SECONDARY} rel="next" to={blogArchivePath(page + 1)}>
            {t("older")}
            <ArrowRight aria-hidden className={cn(ICON_CLASSNAME, "group-hover:translate-x-0.5")} strokeWidth={2} />
          </Link>
        )}
      </div>
    </nav>
  )
}
