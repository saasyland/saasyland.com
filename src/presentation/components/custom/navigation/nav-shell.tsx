import { type JSX, type ReactNode, useCallback, useState } from "react"

import { cn } from "~/src/lib/cn"

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

export const NavShell = ({ children }: Readonly<{ children: ReactNode }>): JSX.Element => {
  const [hasScrolled, setHasScrolled] = useState(false)

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
      <div ref={observeSentinel} aria-hidden className="pointer-events-none absolute top-0 left-0 h-px w-px" />
      <header
        className={cn(
          "fixed inset-x-0 top-0 z-50 border-b transition-[background-color,border-color,backdrop-filter] duration-300 ease-exp motion-reduce:transition-none",
          {
            "border-border bg-background/72 backdrop-blur-xl": hasScrolled,
            "border-transparent bg-transparent": !hasScrolled,
          },
        )}
      >
        {children}

        <div
          ref={observeProgress}
          aria-hidden
          className="scroll-progress pointer-events-none absolute inset-x-0 -bottom-px h-px origin-left bg-ring"
        />
      </header>
    </>
  )
}
