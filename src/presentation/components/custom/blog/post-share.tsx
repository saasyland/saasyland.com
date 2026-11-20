import { type ComponentProps, type JSX, useEffect, useId, useState } from "react"

import { getRouteApi, useHydrated } from "@tanstack/react-router"
import { Check, Link2, Mail, Share } from "lucide-react"
import { Button } from "react-aria-components"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { cn } from "~/src/lib/cn"

import { Bluesky, HackerNews, LinkedIn, Reddit, XLogo } from "~/src/presentation/components/custom/icons"

import { APP_URL } from "~/src/presentation/branding"

const route = getRouteApi("/_site/_marketing/blog/$")

const CONFIRMATION_MS = 2000

const ICON_STROKE = 1.75

const CONTROL_CLASSNAME =
  "inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors duration-200 ease-exp hover:bg-muted hover:text-foreground"

const LINK_CLASSNAME = cn(CONTROL_CLASSNAME, "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring")

const BUTTON_CLASSNAME = cn(
  CONTROL_CLASSNAME,
  "data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring",
)

interface SharedPost {
  readonly title: string
  readonly url: string
}

const SHARE_TARGETS: readonly {
  readonly href: (post: SharedPost) => string
  readonly icon: (props: ComponentProps<"svg">) => JSX.Element
  readonly key: string
}[] = [
  {
    href: ({ title, url }) => `https://x.com/intent/post?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`,
    icon: XLogo,
    key: "x",
  },
  {
    href: ({ url }) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    icon: LinkedIn,
    key: "linkedin",
  },
  {
    href: ({ title, url }) => `https://bsky.app/intent/compose?text=${encodeURIComponent(`${title} ${url}`)}`,
    icon: Bluesky,
    key: "bluesky",
  },
  {
    href: ({ title, url }) => `https://news.ycombinator.com/submitlink?u=${encodeURIComponent(url)}&t=${encodeURIComponent(title)}`,
    icon: HackerNews,
    key: "hackerNews",
  },
  {
    href: ({ title, url }) => `https://www.reddit.com/submit?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    icon: Reddit,
    key: "reddit",
  },
]

const ABORT_ERROR = "AbortError"

const isCancelled = (error: unknown): boolean => error instanceof DOMException && error.name === ABORT_ERROR

export const PostShare = (): JSX.Element => {
  const t = useTranslations("pages.blog.post.share")
  const labelId = useId()
  const hydrated = useHydrated()

  const { post } = route.useLoaderData()
  const [hasCopied, setHasCopied] = useState(false)

  useEffect(() => {
    if (!hasCopied) {
      return
    }
    const timeoutId = globalThis.setTimeout(() => {
      setHasCopied(false)
    }, CONFIRMATION_MS)
    return () => {
      globalThis.clearTimeout(timeoutId)
    }
  }, [hasCopied])

  const canShare = hydrated && "share" in navigator
  const url = new URL(post.url, APP_URL).toString()
  const shared = { title: post.title, url }

  const copyLink = (): void => {
    navigator.clipboard.writeText(url).then(
      () => {
        setHasCopied(true)
        toast.success(t("copied"))
      },
      () => {
        toast.error(t("copyFailed"))
      },
    )
  }

  const shareNatively = (): void => {
    navigator.share(shared).catch((error: unknown) => {
      if (!isCancelled(error)) {
        copyLink()
      }
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
      <span className="font-mono text-label text-muted-foreground uppercase" id={labelId}>
        {t("label")}
      </span>
      <ul aria-labelledby={labelId} className="flex flex-wrap items-center gap-1">
        <li>
          <Button aria-label={t("copy")} className={cn(BUTTON_CLASSNAME, { "text-ring": hasCopied })} onPress={copyLink}>
            {hasCopied && <Check aria-hidden className="size-4" strokeWidth={ICON_STROKE} />}
            {!hasCopied && <Link2 aria-hidden className="size-4" strokeWidth={ICON_STROKE} />}
          </Button>
        </li>
        {SHARE_TARGETS.map(({ href, icon: Icon, key }) => (
          <li key={key}>
            <a aria-label={t(`targets.${key}`)} className={LINK_CLASSNAME} href={href(shared)} rel="noopener noreferrer" target="_blank">
              <Icon className="size-3.5" />
            </a>
          </li>
        ))}
        <li>
          <a
            aria-label={t("targets.email")}
            className={LINK_CLASSNAME}
            href={`mailto:?subject=${encodeURIComponent(post.title)}&body=${encodeURIComponent(url)}`}
          >
            <Mail aria-hidden className="size-4" strokeWidth={ICON_STROKE} />
          </a>
        </li>
        <li className={cn({ invisible: !canShare })}>
          <Button aria-label={t("native")} className={BUTTON_CLASSNAME} onPress={shareNatively}>
            <Share aria-hidden className="size-4" strokeWidth={ICON_STROKE} />
          </Button>
        </li>
      </ul>
    </div>
  )
}
