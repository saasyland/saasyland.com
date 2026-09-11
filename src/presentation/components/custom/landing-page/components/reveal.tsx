import type { JSX, ReactNode } from "react"

import { cn } from "~/src/lib/cn"

const REVEAL_THRESHOLD = 0.12

type OnIntersection = (entry: IntersectionObserverEntry) => void

const observerHolder: { current?: IntersectionObserver } = {}
const observedTargets = new WeakMap<Element, OnIntersection>()

const observe = (element: Element, onIntersection: OnIntersection): (() => void) => {
  observerHolder.current ??= new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        observedTargets.get(entry.target)?.(entry)
      }
    },
    { threshold: REVEAL_THRESHOLD },
  )

  observedTargets.set(element, onIntersection)
  observerHolder.current.observe(element)

  return () => {
    observedTargets.delete(element)
    observerHolder.current?.unobserve(element)
  }
}

const observeElement = (element: HTMLDivElement): (() => void) => {
  let isInitial = true
  const unobserve = observe(element, (entry): void => {
    if (isInitial) {
      isInitial = false
      if (entry.boundingClientRect.top < (entry.rootBounds?.bottom ?? globalThis.innerHeight)) {
        unobserve()
        return
      }
      element.dataset["reveal"] = "hidden"
    } else if (entry.isIntersecting) {
      element.dataset["reveal"] = "revealed"
      unobserve()
    }
  })

  return () => {
    unobserve()
    delete element.dataset["reveal"]
  }
}

type RevealVariant = "block" | "heading" | "quiet"

const VARIANT_CLASSNAME: Record<RevealVariant, string> = {
  block: "[--rise-duration:560ms] [--rise-distance:0.75rem]",
  heading: "[--rise-duration:700ms] [--rise-distance:1rem]",
  quiet: "[--rise-duration:420ms] [--rise-distance:0rem]",
}

interface RevealProps {
  readonly children: ReactNode
  readonly className?: string
  readonly delay?: number
  readonly variant?: RevealVariant
}

export const Reveal = ({ children, className, delay = 0, variant = "block" }: RevealProps): JSX.Element => (
  <div
    ref={observeElement}
    style={{ animationDelay: `${delay}ms`, animationFillMode: "backwards" }}
    className={cn(
      VARIANT_CLASSNAME[variant],
      "motion-safe:data-[reveal=hidden]:opacity-0 motion-safe:data-[reveal=revealed]:animate-rise",
      className,
    )}
  >
    {children}
  </div>
)
