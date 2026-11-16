import { type JSX, useCallback, useState } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { useNavigationLabel } from "~/src/hooks/use-navigation-label"

import { HEADER_NAVIGATION } from "~/src/data/navigation"
import { MARKETING_SECTION_IDS, SITE_CONTENT_ID } from "~/src/data/navigation.constants"

import { cn } from "~/src/lib/cn"

import { HomeLink } from "~/src/presentation/components/custom/home-link"
import { MobileMenu } from "~/src/presentation/components/custom/mobile-menu"

import { ROUTES } from "~/src/routes"

const MAX_PROGRESS = 1

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

export const Navigation = (): JSX.Element => {
  const [hasScrolled, setHasScrolled] = useState(false)

  const t = useTranslations("components.custom.navigation")
  const navigationLabel = useNavigationLabel()

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
      <a
        className="sr-only rounded-md bg-background px-3 py-2 text-body-sm font-medium text-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        href={`#${SITE_CONTENT_ID}`}
      >
        {t("skipToContent")}
      </a>
      <div aria-hidden className="pointer-events-none absolute top-0 left-0 h-px w-px" ref={observeSentinel} />
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-40 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ease-exp motion-reduce:transition-none",
          {
            "border-border bg-background/72 backdrop-blur-xl": hasScrolled,
            "border-transparent bg-transparent": !hasScrolled,
          },
        )}
      >
        <nav
          aria-label={t("ariaLabel")}
          className="mx-auto flex h-header w-full max-w-7xl items-center justify-between gap-6 px-6 md:px-10"
        >
          <HomeLink />

          <div className="flex items-center gap-2 lg:gap-4">
            <div className="hidden items-center gap-1 lg:flex">
              {HEADER_NAVIGATION.map((entry) => (
                <Link
                  {...(entry.hash === undefined ? {} : { activeOptions: { includeHash: true }, hash: entry.hash })}
                  className="relative rounded-md px-2 py-1.5 text-body-sm whitespace-nowrap text-muted-foreground transition-colors duration-200 ease-exp hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring data-[status=active]:text-foreground"
                  key={entry.key}
                  to={entry.to}
                >
                  {({ isActive }) => (
                    <>
                      {navigationLabel(entry)}
                      {isActive && <span aria-hidden className="absolute inset-x-0 -bottom-0.5 mx-auto size-0.75 rounded-full bg-ring" />}
                    </>
                  )}
                </Link>
              ))}
            </div>
            <Link
              activeOptions={{ includeHash: true }}
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
