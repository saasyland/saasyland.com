import type { JSX } from "react"

import { BLOG_COVER } from "~/src/data/blog"

import { cn } from "~/src/lib/cn"

interface PostCoverProps {
  readonly className?: string
  readonly image: string | undefined
  readonly isPriority?: boolean
}

export const PostCover = ({ className, image, isPriority = false }: PostCoverProps): JSX.Element => {
  if (image === undefined) {
    return (
      <div
        aria-hidden
        className={cn("aspect-[2.4/1] bg-radial-[at_50%_100%] from-ring/25 via-card via-60% to-background", className)}
        data-slot="post-cover"
      />
    )
  }

  return (
    <img
      alt=""
      className={cn("aspect-[2.4/1] object-cover", className)}
      data-slot="post-cover"
      decoding="async"
      fetchPriority={isPriority ? "high" : "auto"}
      height={BLOG_COVER.HEIGHT}
      loading={isPriority ? "eager" : "lazy"}
      src={image}
      width={BLOG_COVER.WIDTH}
    />
  )
}
