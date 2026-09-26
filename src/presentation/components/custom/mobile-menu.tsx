import { type JSX, useEffect, useState } from "react"

import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { Button } from "~/src/presentation/components/shadcn/button"

import { ROUTES } from "~/src/routes"

const SECTIONS = [
  MARKETING_SECTION_IDS.FOUNDATION,
  MARKETING_SECTION_IDS.QUALITY,
  MARKETING_SECTION_IDS.TOOLKIT,
  MARKETING_SECTION_IDS.PRICING,
  MARKETING_SECTION_IDS.FAQ,
] as const

const MENU_ID = "landing-mobile-menu"

const ROW_CLASSNAME =
  "group flex items-center justify-between gap-6 py-4 text-[1.0625rem] font-medium tracking-tight text-foreground transition-colors duration-200 ease-exp hover:text-muted-foreground"

export const MobileMenu = (): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)

  const t = useTranslations("components.custom.navigation")

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
          className="absolute inset-x-0 top-full h-[calc(100svh-4rem)] overflow-y-auto overscroll-contain border-t border-border bg-background transition-[opacity,transform] duration-300 ease-exp motion-reduce:transition-none starting:-translate-y-2 starting:opacity-0"
          id={MENU_ID}
        >
          <ul className="mx-auto w-full max-w-7xl divide-y divide-border px-6 pb-10">
            {SECTIONS.map((id) => (
              <li key={id}>
                <Link className={ROW_CLASSNAME} hash={id} onClick={close} to={ROUTES.HOME}>
                  {t(`items.${id}`)}
                </Link>
              </li>
            ))}
            <li>
              <Link className={ROW_CLASSNAME} to={ROUTES.DOCS}>
                {t("items.docs")}
                <ArrowUpRight
                  aria-hidden
                  className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-exp group-hover:translate-x-px group-hover:-translate-y-px"
                  strokeWidth={1.5}
                />
              </Link>
            </li>
            <li>
              <Link className={ROW_CLASSNAME} onClick={close} to={ROUTES.SIGN_IN}>
                {t("signIn")}
              </Link>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
