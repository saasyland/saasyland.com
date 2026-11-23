import type { JSX } from "react"

import { Link, getRouteApi } from "@tanstack/react-router"
import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { BlogPostSummary } from "~/src/integrations/fumadocs/fumadocs.blog"

import { cn } from "~/src/lib/cn"

import { PostCover } from "~/src/presentation/components/custom/blog/post-cover"
import { PostFacts, PostTags } from "~/src/presentation/components/custom/blog/post-facts"

const route = getRouteApi("/_site/_marketing/blog/")

const CARD_CLASSNAME =
  "group relative isolate flex overflow-hidden rounded-lg border border-border bg-card transition-[border-color,translate,box-shadow] duration-300 ease-exp hover:border-ring/40 hover:shadow-[0_24px_48px_-24px_oklch(0_0_0/0.7)] motion-safe:hover:-translate-y-0.5"

const COVER_CLASSNAME = "size-full transition-transform duration-700 ease-exp motion-safe:group-hover:scale-103"

const TITLE_LINK_CLASSNAME =
  "after:absolute after:inset-0 after:z-10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"

const ReadPost = (): JSX.Element => {
  const t = useTranslations("pages.blog.index")

  return (
    <span aria-hidden className="inline-flex items-center gap-2 text-body-sm font-medium text-foreground">
      {t("read")}
      <ArrowRight className="size-4 transition-transform duration-300 ease-exp motion-safe:group-hover:translate-x-1" />
    </span>
  )
}

const LeadPost = ({ post }: { readonly post: BlogPostSummary }): JSX.Element => (
  <article className={cn(CARD_CLASSNAME, "flex-col xl:grid xl:grid-cols-[1.3fr_1fr]")}>
    <div className="relative overflow-hidden border-b border-border xl:border-r xl:border-b-0">
      <PostCover className={COVER_CLASSNAME} image={post.image} isPriority />
      <span aria-hidden className="absolute inset-0 hidden bg-linear-to-r from-transparent via-transparent to-card/80 xl:block" />
    </div>
    <div className="flex flex-col p-7 md:p-10">
      <PostFacts post={post} />
      <h3 className="mt-5 text-headline-support text-balance text-foreground">
        <Link className={TITLE_LINK_CLASSNAME} to={post.url}>
          {post.title}
        </Link>
      </h3>
      {post.summary !== undefined && (
        <p className="mt-4 line-clamp-4 max-w-[56ch] text-body text-pretty text-muted-foreground">{post.summary}</p>
      )}
      <PostTags className="mt-6" tags={post.tags} />
      <div className="mt-auto pt-8">
        <ReadPost />
      </div>
    </div>
  </article>
)

const SidePost = ({ post }: { readonly post: BlogPostSummary }): JSX.Element => (
  <article className={cn(CARD_CLASSNAME, "h-full flex-col")}>
    <div className="relative overflow-hidden border-b border-border">
      <PostCover className={COVER_CLASSNAME} image={post.image} />
    </div>
    <div className="flex flex-1 flex-col p-6 md:p-8">
      <PostFacts post={post} />
      <h3 className="mt-4 text-title text-balance text-foreground md:text-lead md:font-semibold">
        <Link className={TITLE_LINK_CLASSNAME} to={post.url}>
          {post.title}
        </Link>
      </h3>
      {post.summary !== undefined && <p className="mt-3 line-clamp-3 text-body-sm text-pretty text-muted-foreground">{post.summary}</p>}
      <PostTags className="mt-auto pt-6" tags={post.tags} />
    </div>
  </article>
)

export const FeaturedPosts = (): JSX.Element | undefined => {
  const t = useTranslations("pages.blog.index")

  const { featured } = route.useLoaderData()
  const [lead, ...others] = featured

  if (lead === undefined) {
    return
  }

  return (
    <section aria-labelledby="featured-posts">
      <h2 className="text-headline-support text-balance text-foreground" id="featured-posts">
        {t("featured")}
      </h2>
      <div className="mt-6">
        <LeadPost post={lead} />
      </div>
      {others.length > 0 && (
        <ul className="mt-6 grid gap-6 md:grid-cols-2">
          {others.map((post) => (
            <li key={post.url}>
              <SidePost post={post} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
