import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { CLI_GENERATION_VALUES } from "~/src/data/cli"
import { CTA_CLASSES } from "~/src/data/cta"
import { MARKETING_SECTION_IDS } from "~/src/data/navigation.constants"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { ROUTES } from "~/src/routes"

export const PostCta = (): JSX.Element => {
  const t = useTranslations("pages.blog.post.cta")

  return (
    <aside className="mt-16 rounded-xl border border-border bg-card p-7 md:p-8">
      <p className="font-mono text-label text-muted-foreground uppercase">{t("label")}</p>
      <h2 className="mt-3 max-w-[26ch] text-title text-balance text-foreground">{t("title")}</h2>
      <p className="mt-3 max-w-[64ch] text-body-sm text-pretty text-muted-foreground">
        {t("body", { ...REPOSITORY_FACTS, ...CLI_GENERATION_VALUES })}
      </p>

      <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-4">
        <Link className={CTA_CLASSES.PRIMARY} hash={MARKETING_SECTION_IDS.PRICING} to={ROUTES.HOME}>
          {t("primary")}
        </Link>
        <Link className={CTA_CLASSES.SECONDARY} to={ROUTES.DOCS}>
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
