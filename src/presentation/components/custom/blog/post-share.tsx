import type { JSX } from "react"

import { getRouteApi } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { MotionProvider } from "~/src/providers/motion-provider"

import { CopyButton } from "~/src/presentation/components/custom/copy-button"

import { APP_URL } from "~/src/presentation/branding"

const route = getRouteApi("/blog/$")

const LINK_CLASSNAME =
  "inline-flex h-7 shrink-0 cursor-pointer items-center justify-center rounded-md px-1.5 text-muted-foreground transition-colors duration-200 ease-exp hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

export const PostShare = (): JSX.Element => {
  const { post } = route.useLoaderData()
  const t = useTranslations("pages.blog.post.share")

  const url = new URL(post.url, APP_URL).toString()

  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="font-mono text-label text-muted-foreground uppercase">{t("label")}</span>
      <a
        aria-label={t("x")}
        className={LINK_CLASSNAME}
        href={`https://x.com/intent/post?text=${encodeURIComponent(post.title)}&url=${encodeURIComponent(url)}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <svg aria-hidden className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </a>
      <a
        aria-label={t("linkedin")}
        className={LINK_CLASSNAME}
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`}
        rel="noopener noreferrer"
        target="_blank"
      >
        <svg aria-hidden className="size-3.5" fill="currentColor" viewBox="0 0 24 24">
          <path d="M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5M2.4 21.5h5.16V9.75H2.4zm7.72 0h5.16v-6.19c0-3.27 4.24-3.53 4.24 0v6.19h5.16v-7.97c0-8.06-9.22-7.76-9.4-3.8V9.75h-5.16z" />
        </svg>
      </a>
      <MotionProvider>
        <CopyButton copiedLabel={t("copied")} copyLabel={t("copy")} value={url} />
      </MotionProvider>
    </div>
  )
}
