import { type JSX, type ReactNode, useCallback, useState } from "react"

import { cn } from "~/src/lib/cn"
import { type ReadingLayout, type Span, readingFrame } from "~/src/lib/table-of-contents"

const TOP_DEPTH = 2
const READING_LINE_RATIO = 0.25
const CENTER = 0.5
const NO_SECTION = -1
const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"
const THUMB_TOP = "--thumb-top"
const THUMB_HEIGHT = "--thumb-height"

interface TableOfContentsItem {
  readonly depth: number
  readonly title: ReactNode
  readonly url: string
}

interface TableOfContentsProps {
  readonly className: string
  readonly items: readonly TableOfContentsItem[]
}

interface MeasuredLayout extends ReadingLayout {
  readonly links: readonly number[]
}

const UNMEASURED: MeasuredLayout = { entries: [], glide: 0, headings: [], line: 0, links: [] }

interface Section {
  readonly entry: Span
  readonly heading: number
  readonly link: number
}

const measure = (list: HTMLElement): MeasuredLayout => {
  const sections = [...list.querySelectorAll("a")].flatMap((anchor, link): Section[] => {
    const id = decodeURIComponent(anchor.hash.slice(1))
    const heading = document.querySelector(`#${CSS.escape(id)}`)
    if (heading === null) {
      return []
    }

    const { height, top } = heading.getBoundingClientRect()
    if (height === 0) {
      return []
    }

    return [{ entry: { height: anchor.offsetHeight, top: anchor.offsetTop }, heading: top + globalThis.scrollY, link }]
  })
  const viewport = document.documentElement.clientHeight
  const line = viewport * READING_LINE_RATIO

  return {
    entries: sections.map(({ entry }) => entry),
    glide: viewport - line,
    headings: sections.map(({ heading }) => heading),
    line,
    links: sections.map(({ link }) => link),
  }
}

const keepInView = (list: HTMLElement, entry: Span | undefined, isReduced: boolean): void => {
  if (entry === undefined || (entry.top >= list.scrollTop && entry.top + entry.height <= list.scrollTop + list.clientHeight)) {
    return
  }

  list.scrollTo({ behavior: isReduced ? "instant" : "smooth", top: entry.top + (entry.height - list.clientHeight) * CENTER })
}

const trackReading = (list: HTMLDivElement, onSection: (link: number) => void): (() => void) => {
  const motion = globalThis.matchMedia(REDUCED_MOTION)
  const controller = new AbortController()
  const { signal } = controller
  let layout = UNMEASURED
  let shown = Number.NaN
  let frame = 0

  const render = (): void => {
    frame = 0
    const { active, thumb: span } = readingFrame(layout, globalThis.scrollY, !motion.matches)
    list.style.setProperty(THUMB_TOP, `${String(span.top)}px`)
    list.style.setProperty(THUMB_HEIGHT, String(span.height))
    if (active !== shown) {
      shown = active
      onSection(layout.links[active] ?? NO_SECTION)
      keepInView(list, layout.entries[active], motion.matches)
    }
  }
  const schedule = (): void => {
    if (frame === 0) {
      frame = requestAnimationFrame(render)
    }
  }
  const remeasure = (): void => {
    layout = measure(list)
    schedule()
  }

  const observer = new ResizeObserver(remeasure)
  observer.observe(document.documentElement)
  observer.observe(list)
  globalThis.addEventListener("scroll", schedule, { passive: true, signal })
  globalThis.addEventListener("resize", remeasure, { signal })
  motion.addEventListener("change", schedule, { signal })

  return () => {
    controller.abort()
    observer.disconnect()
    cancelAnimationFrame(frame)
  }
}

export const TableOfContents = ({ className, items }: TableOfContentsProps): JSX.Element => {
  const [current, setCurrent] = useState(NO_SECTION)

  const track = useCallback((list: HTMLDivElement) => trackReading(list, setCurrent), [items])

  return (
    <div className={cn("custom-scrollbar relative overflow-y-auto overscroll-contain pr-3", className)} ref={track}>
      <span
        aria-hidden
        className="pointer-events-none absolute top-0 left-0 h-px w-px origin-top translate-y-(--thumb-top) scale-y-[var(--thumb-height,0)] bg-ring"
      />
      <ul>
        {items.map((item, link) => (
          <li key={item.url}>
            <a
              aria-current={link === current ? "location" : undefined}
              className={cn(
                "block border-l border-border py-1.5 text-body-sm text-pretty text-muted-foreground transition-colors duration-200 ease-exp hover:border-ring hover:text-foreground focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring aria-[current=location]:text-ring",
                { "pl-4": item.depth <= TOP_DEPTH, "pl-7": item.depth > TOP_DEPTH },
              )}
              href={item.url}
            >
              {item.title}
            </a>
          </li>
        ))}
      </ul>
    </div>
  )
}
