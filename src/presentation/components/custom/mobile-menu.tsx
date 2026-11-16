import { type JSX, useEffect, useState } from "react"

import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { useNavigationLabel } from "~/src/hooks/use-navigation-label"

import { HEADER_NAVIGATION } from "~/src/data/navigation"

import { Button } from "~/src/presentation/components/shadcn/button"

const MENU_ID = "mobile-menu"

export const MobileMenu = (): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)

  const t = useTranslations("components.custom.navigation")
  const navigationLabel = useNavigationLabel()

  const close = (): void => {
    setIsOpen(false)
  }

  useEffect(() => {
    if (!isOpen) {
      return
    }

    const closeOnEscape = (event: KeyboardEvent): void => {
      if (event.key === "Escape") {
        setIsOpen(false)
      }
    }

    document.addEventListener("keydown", closeOnEscape)

    return () => {
      document.removeEventListener("keydown", closeOnEscape)
    }
  }, [isOpen])

  return (
    <div className="lg:hidden">
      <Button
        aria-controls={MENU_ID}
        aria-expanded={isOpen}
        aria-label={t(isOpen ? "closeMenu" : "openMenu")}
        className="size-11"
        onPress={() => {
          setIsOpen((open) => !open)
        }}
        size="icon-lg"
        variant="ghost"
      >
        {isOpen && <X aria-hidden className="size-4.5" strokeWidth={1.5} />}
        {!isOpen && <Menu aria-hidden className="size-4.5" strokeWidth={1.5} />}
      </Button>
      {isOpen && (
        <div
          className="absolute inset-x-0 top-full h-[calc(100svh-var(--spacing-header))] overflow-y-auto overscroll-contain border-t border-border bg-background transition-[opacity,transform] duration-300 ease-exp motion-reduce:transition-none starting:-translate-y-2 starting:opacity-0"
          id={MENU_ID}
        >
          <ul className="mx-auto w-full max-w-7xl divide-y divide-border px-6 pb-10">
            {HEADER_NAVIGATION.map((entry) => (
              <li key={entry.key}>
                <Link
                  {...(entry.hash === undefined ? {} : { activeOptions: { includeHash: true }, hash: entry.hash })}
                  className="group flex items-center justify-between gap-6 py-4 text-[1.0625rem] font-medium tracking-tight text-foreground transition-colors duration-200 ease-exp hover:text-muted-foreground"
                  onClick={close}
                  to={entry.to}
                >
                  {navigationLabel(entry)}
                  <ArrowUpRight
                    aria-hidden
                    className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-exp group-hover:translate-x-px group-hover:-translate-y-px"
                    strokeWidth={1.5}
                  />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
