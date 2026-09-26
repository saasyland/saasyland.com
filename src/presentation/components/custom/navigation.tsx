import { type JSX, useCallback, useEffect, useState } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { cn } from "~/src/lib/cn"

import { MobileMenu } from "~/src/presentation/components/custom/mobile-menu"
import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { ROUTES } from "~/src/routes"

const SECTIONS = [
  MARKETING_SECTION_IDS.FOUNDATION,
  MARKETING_SECTION_IDS.QUALITY,
  MARKETING_SECTION_IDS.TOOLKIT,
  MARKETING_SECTION_IDS.PRICING,
  MARKETING_SECTION_IDS.FAQ,
] as const

const PAGES = [
  { key: "blog", to: ROUTES.BLOG },
  { key: "docs", to: ROUTES.DOCS },
] as const

const ACTIVE_BAND = "-42% 0px -58% 0px"
const MAX_PROGRESS = 1

const LINK_CLASSNAME =
  "relative rounded-md px-2 py-1.5 text-body-sm transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const observeProgress = (element: HTMLDivElement | null): (() => void) | undefined => {
  if (!element || CSS.supports("animation-timeline: scroll(root)")) {
    return
  }

  let contentHeight = 0

  const updateProgress = (): void => {
    const scrollableHeight = contentHeight - globalThis.innerHeight
    const progress = scrollableHeight > 0 ? Math.max(0, Math.min(MAX_PROGRESS, globalThis.scrollY / scrollableHeight)) : 0
    element.style.transform = `scaleX(${progress})`
  }

  const observer = new ResizeObserver(([entry]) => {
    if (entry) {
      contentHeight = entry.contentRect.height
      updateProgress()
    }
  })
  observer.observe(document.body)
  globalThis.addEventListener("scroll", updateProgress, { passive: true })
  globalThis.addEventListener("resize", updateProgress)

  return () => {
    observer.disconnect()
    globalThis.removeEventListener("scroll", updateProgress)
    globalThis.removeEventListener("resize", updateProgress)
  }
}

const SectionLinks = (): JSX.Element => {
  const t = useTranslations("components.custom.navigation")
  const [active, setActive] = useState<string>()

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActive(entry.target.id)
          }
        }
      },
      { rootMargin: ACTIVE_BAND },
    )

    for (const id of SECTIONS) {
      const section = document.querySelector(`#${id}`)
      if (section) {
        observer.observe(section)
      }
    }

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <nav className="hidden items-center gap-1 lg:flex">
      {SECTIONS.map((id) => (
        <Link
          className={cn(LINK_CLASSNAME, {
            "text-foreground": active === id,
            "text-muted-foreground": active !== id,
          })}
          hash={id}
          key={id}
          to={ROUTES.HOME}
        >
          {t(`items.${id}`)}
          {active === id && <span aria-hidden className="absolute inset-x-0 -bottom-0.5 mx-auto size-0.75 rounded-full bg-ring" />}
        </Link>
      ))}
      {PAGES.map((page) => (
        <Link className={cn(LINK_CLASSNAME, "text-muted-foreground")} key={page.key} to={page.to}>
          {t(`items.${page.key}`)}
        </Link>
      ))}
    </nav>
  )
}

export const Navigation = (): JSX.Element => {
  const [hasScrolled, setHasScrolled] = useState(false)

  const t = useTranslations("components.custom.navigation")

  const observeSentinel = useCallback((sentinel: HTMLDivElement): (() => void) => {
    const observer = new IntersectionObserver(([entry]) => {
      setHasScrolled(entry?.isIntersecting !== true)
    })
    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <>
      <div aria-hidden className="pointer-events-none absolute top-0 left-0 h-px w-px" ref={observeSentinel} />
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ease-exp motion-reduce:transition-none",
          {
            "border-border bg-background/72 backdrop-blur-xl": hasScrolled,
            "border-transparent bg-transparent": !hasScrolled,
          },
        )}
      >
        <nav aria-label={t("ariaLabel")} className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-6 px-6 md:px-10">
          <Link className="rounded-md focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring" to={ROUTES.HOME}>
            <Wordmark />
          </Link>

          <div className="flex items-center gap-2 lg:gap-4">
            <SectionLinks />
            <Link
              className="hidden shrink-0 rounded-md px-1 text-body-sm font-medium whitespace-nowrap text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring sm:inline-flex"
              to={ROUTES.SIGN_IN}
            >
              {t("signIn")}
            </Link>
            <Link
              className="hidden h-9 shrink-0 items-center rounded-lg border border-border bg-card/60 px-3.5 text-body-sm font-medium whitespace-nowrap text-foreground transition-[color,border-color,background-color] duration-200 ease-exp hover:border-border hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring active:translate-y-px sm:inline-flex"
              hash={MARKETING_SECTION_IDS.PRICING}
              to={ROUTES.HOME}
            >
              {t("getStarted")}
            </Link>
            <MobileMenu />
          </div>
        </nav>

        <div
          aria-hidden
          className="scroll-progress pointer-events-none absolute inset-x-0 -bottom-px h-px origin-left bg-ring"
          ref={observeProgress}
        />
      </header>
    </>
  )
}
