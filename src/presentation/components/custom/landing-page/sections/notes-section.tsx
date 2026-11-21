import type { JSX } from "react"

import { Link, getRouteApi } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"

import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import { PostCover } from "~/src/presentation/components/custom/blog/post-cover"
import { HighlightGroup, HighlightItem } from "~/src/presentation/components/custom/highlight"
import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

import { ROUTES } from "~/src/routes"

const landingRoute = getRouteApi("/_site/_marketing/")

const GRID_DELAY_MS = 100

const TITLE_LINK_CLASSNAME =
  "after:absolute after:inset-0 after:z-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"

const NoteFacts = ({ post }: { readonly post: BlogPostSummary }): JSX.Element => {
  const t = useTranslations("pages.landing.notes")
  const format = useFormatter()

  return (
    <p className="font-mono text-spec text-muted-foreground tabular-nums">
      <time dateTime={new Date(post.date).toISOString()}>{format.dateTime(new Date(post.date), "calendarDate")}</time>
      <span aria-hidden className="mx-2 text-border">
        &middot;
      </span>
      {t("readingTime", { minutes: post.readingTimeMinutes })}
    </p>
  )
}

const LeadNote = ({ post }: { readonly post: BlogPostSummary }): JSX.Element => {
  const t = useTranslations("pages.landing.notes")

  return (
    <article className="group relative isolate flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card transition-[border-color,translate,box-shadow] duration-300 ease-exp hover:border-ring/40 hover:shadow-[0_24px_48px_-24px_oklch(0_0_0/0.7)] motion-safe:hover:-translate-y-0.5">
      <div className="overflow-hidden border-b border-border">
        <PostCover className="w-full transition-transform duration-700 ease-exp motion-safe:group-hover:scale-103" image={post.image} />
      </div>
      <div className="flex flex-1 flex-col p-7 md:p-9">
        <NoteFacts post={post} />
        <h3 className="mt-4 text-headline-support text-balance text-foreground">
          <Link className={TITLE_LINK_CLASSNAME} to={post.url}>
            {post.title}
          </Link>
        </h3>
        {post.summary !== undefined && (
          <p className="mt-4 line-clamp-3 max-w-[60ch] text-body text-pretty text-muted-foreground">{post.summary}</p>
        )}
        <span aria-hidden className="mt-auto inline-flex items-center gap-2 pt-8 text-body-sm font-medium text-foreground">
          {t("read")}
          <ArrowRight className="size-4 transition-transform duration-300 ease-exp motion-safe:group-hover:translate-x-1" />
        </span>
      </div>
    </article>
  )
}

export const NotesSection = (): JSX.Element => {
  const t = useTranslations("pages.landing.notes")

  const { notes } = landingRoute.useLoaderData()

  return (
    <section className="relative border-t border-border">
      <div className="mx-auto w-full max-w-site px-6 py-24 md:px-10 md:py-32">
        <Reveal variant="heading">
          <h2 className="max-w-[18ch] text-headline-peak text-balance text-foreground">{t("title")}</h2>
          <p className="mt-5 max-w-2xl text-lead text-pretty text-muted-foreground">{t("description", REPOSITORY_FACTS)}</p>
        </Reveal>

        <Reveal className="mt-14 grid gap-12 md:mt-20 lg:grid-cols-[1.3fr_1fr] lg:gap-14" delay={GRID_DELAY_MS}>
          {notes.lead !== undefined && <LeadNote post={notes.lead} />}

          <div className="flex flex-col">
            <h3 className="font-mono text-label text-muted-foreground uppercase lg:px-5">{t("latest")}</h3>
            <HighlightGroup className="-mx-4 mt-4 divide-y divide-border border-y border-border lg:mx-0" name="notes-highlight">
              {notes.latest.map((post) => (
                <HighlightItem className="group" contentClassName="px-4 py-6 lg:px-5" id={post.url} key={post.url}>
                  <NoteFacts post={post} />
                  <h4 className="mt-2 text-title text-balance text-foreground">
                    <Link className={TITLE_LINK_CLASSNAME} to={post.url}>
                      {post.title}
                    </Link>
                  </h4>
                  {post.summary !== undefined && (
                    <p className="mt-2 line-clamp-2 text-body-sm text-pretty text-muted-foreground transition-colors duration-400 ease-exp group-hover:text-foreground">
                      {post.summary}
                    </p>
                  )}
                </HighlightItem>
              ))}
            </HighlightGroup>

            <Link
              className="group mt-8 inline-flex items-center gap-2 self-start rounded-sm text-body-sm font-medium text-foreground transition-colors duration-200 ease-exp hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring lg:ml-5"
              to={ROUTES.BLOG}
            >
              {t("cta")}
              <ArrowRight
                aria-hidden
                className="size-3.5 transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
                strokeWidth={2}
              />
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
