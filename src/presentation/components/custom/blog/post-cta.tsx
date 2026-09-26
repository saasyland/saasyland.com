import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { ROUTES } from "~/src/routes"

export const PostCta = (): JSX.Element => {
  const t = useTranslations("pages.blog.post.cta")

  return (
    <aside className="mt-16 rounded-xl border border-border bg-card p-7 md:p-8">
      <p className="font-mono text-label text-muted-foreground uppercase">{t("label")}</p>
      <h2 className="mt-3 max-w-[26ch] text-title text-balance text-foreground">{t("title")}</h2>
      <p className="mt-3 max-w-[64ch] text-body-sm text-pretty text-muted-foreground">{t("body")}</p>

      <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-4">
        <Link
          className="inline-flex h-11 items-center rounded-lg bg-primary px-5 text-body-sm font-semibold whitespace-nowrap text-primary-foreground transition-[background-color,transform] duration-200 ease-exp hover:bg-primary/88 focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px"
          hash={MARKETING_SECTION_IDS.PRICING}
          to={ROUTES.HOME}
        >
          {t("primary")}
        </Link>
        <Link
          className="group inline-flex h-11 items-center gap-1.5 rounded-lg border border-border bg-card/60 px-5 text-body-sm font-medium whitespace-nowrap text-foreground transition-[background-color,border-color,transform] duration-200 ease-exp hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-ring active:translate-y-px"
          to={ROUTES.DOCS}
        >
          {t("secondary")}
          <ArrowRight
            aria-hidden
            className="size-3.5 text-muted-foreground transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
            strokeWidth={2}
          />
        </Link>
      </div>
    </aside>
  )
}
