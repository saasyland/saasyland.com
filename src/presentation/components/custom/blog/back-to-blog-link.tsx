import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { ROUTES } from "~/src/routes"

export const BackToBlogLink = (): JSX.Element => {
  const t = useTranslations("pages.blog.post")

  return (
    <Link
      className="inline-flex items-center gap-2 text-label text-muted-foreground uppercase transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
      to={ROUTES.BLOG.INDEX}
    >
      <span aria-hidden>&larr;</span>
      {t("backToBlog")}
    </Link>
  )
}
