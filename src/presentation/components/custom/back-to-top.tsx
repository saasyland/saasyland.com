import { type JSX, useCallback, useState } from "react"

import { ArrowUp } from "lucide-react"
import { Button } from "react-aria-components"
import { useTranslations } from "use-intl/react"

import { cn } from "~/src/lib/cn"

const FIRST_SCREEN = "100% 0px 0px 0px"

const returnToTop = (): void => {
  globalThis.scrollTo({ top: 0 })

  const heading = document.querySelector("h1")
  if (heading) {
    heading.tabIndex = -1
    heading.focus({ preventScroll: true })
  }
}

export const BackToTop = (): JSX.Element => {
  const [isVisible, setIsVisible] = useState(false)

  const t = useTranslations("components.custom.back-to-top")

  const observeSentinel = useCallback((sentinel: HTMLDivElement): (() => void) => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setIsVisible(!entry.isIntersecting)
        }
      },
      { rootMargin: FIRST_SCREEN },
    )
    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [])

  return (
    <>
      <div aria-hidden className="pointer-events-none absolute top-0 left-0 h-px w-px" ref={observeSentinel} />
      <Button
        aria-label={t("label")}
        className={cn(
          "group fixed right-4 bottom-4 z-30 flex size-11 cursor-pointer items-center justify-center rounded-lg border border-border bg-background/72 text-muted-foreground backdrop-blur-xl transition-[opacity,translate,visibility,color,background-color] duration-200 ease-exp hover:bg-muted hover:text-foreground data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring data-pressed:translate-y-px motion-reduce:transition-none md:right-6 md:bottom-6",
          { "invisible translate-y-2 opacity-0": !isVisible },
        )}
        onPress={returnToTop}
      >
        <ArrowUp
          aria-hidden
          className="size-4 transition-transform duration-200 ease-exp group-hover:-translate-y-0.5 motion-reduce:transform-none motion-reduce:transition-none"
          strokeWidth={1.5}
        />
      </Button>
    </>
  )
}
