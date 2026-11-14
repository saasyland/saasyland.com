import type { JSX } from "react"

import { useQuery } from "@tanstack/react-query"
import { useFormatter, useTranslations } from "use-intl/react"

import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { starCountQuery } from "~/src/lib/github"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { HighlightGroup, HighlightItem } from "~/src/presentation/components/custom/highlight"

const FACT_KEYS = ["coverage", "tests", "locales", "components", "mau", "stars", "upkeep", "types", "tables", "admin"] as const

export const ProofSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.proof")
  const format = useFormatter()

  const { data: stars } = useQuery(starCountQuery)

  const starCount = typeof stars === "number" ? format.number(stars) : <Skeleton aria-hidden className="h-7 w-16" />

  return (
    <section className="relative border-t border-border">
      <div className="mx-auto w-full max-w-7xl">
        <HighlightGroup className="grid grid-cols-2 gap-px bg-border md:grid-cols-5" element="dl" name="proof-highlight">
          {FACT_KEYS.map((key) => (
            <HighlightItem className="bg-background" contentClassName="px-6 py-8 md:px-8 md:py-10" id={key} key={key}>
              <dt className="font-mono text-label break-words text-muted-foreground uppercase">{t(`facts.${key}.label`)}</dt>
              <dd className="mt-3 text-[1.75rem] leading-none font-semibold tracking-[-0.035em] text-foreground tabular-nums">
                {key === "stars" ? starCount : t(`facts.${key}.value`, REPOSITORY_FACTS)}
              </dd>
              <dd className="mt-2 text-body-sm text-pretty text-muted-foreground">{t(`facts.${key}.note`, REPOSITORY_FACTS)}</dd>
            </HighlightItem>
          ))}
        </HighlightGroup>
      </div>
    </section>
  )
}
