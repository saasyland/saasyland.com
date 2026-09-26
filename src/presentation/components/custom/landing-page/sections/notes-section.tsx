import type { JSX } from "react"

import { Link, getRouteApi } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { HighlightGroup, HighlightItem } from "~/src/presentation/components/custom/highlight"
import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

import { ROUTES } from "~/src/routes"

const landingRoute = getRouteApi("/_landing/")

const GRID_DELAY_MS = 100

const DATE_FORMAT = { day: "numeric", month: "short", year: "numeric" } as const

export const NotesSection = (): JSX.Element => {
  const { posts } = landingRoute.useLoaderData()
  const format = useFormatter()
  const t = useTranslations("pages.landing.notes")

  return (
    <section className="relative border-t border-border">
      <div className="mx-auto w-full max-w-7xl px-6 py-24 md:px-10 md:py-32">
        <Reveal variant="heading">
          <h2 className="max-w-[18ch] text-headline-peak text-balance text-foreground">{t("title")}</h2>
          <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{t("description")}</p>
        </Reveal>

        <Reveal className="mt-14 md:mt-20" delay={GRID_DELAY_MS}>
          <HighlightGroup className="grid gap-px border-y border-border bg-border md:grid-cols-3" name="notes-highlight">
            {posts.map(({ date, readingTimeMinutes: minutes, summary, title, url }) => (
              <HighlightItem
                className="group bg-background"
                contentClassName="flex h-full flex-col px-6 py-8 md:px-8 md:py-10"
                id={url}
                key={url}
              >
                <p className="font-mono text-label text-muted-foreground uppercase tabular-nums">
                  {format.dateTime(new Date(date), DATE_FORMAT)}
                  {` · ${t("readingTime", { minutes })}`}
                </p>
                <h3 className="mt-4 text-title text-balance text-foreground">
                  <Link
                    className="after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
                    to={url}
                  >
                    {title}
                  </Link>
                </h3>
                {summary !== undefined && (
                  <p className="mt-3 text-body-sm text-pretty text-muted-foreground transition-colors duration-400 ease-exp group-hover:text-foreground">
                    {summary}
                  </p>
                )}
              </HighlightItem>
            ))}
          </HighlightGroup>

          <Link
            className="group mt-10 inline-flex items-center gap-2 rounded-sm text-body-sm font-medium text-foreground transition-colors duration-200 ease-exp hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            to={ROUTES.BLOG}
          >
            {t("cta")}
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
              strokeWidth={2}
            />
          </Link>
        </Reveal>
      </div>
    </section>
  )
}
