import { type JSX, useState } from "react"

import { Link, useLinkProps } from "@tanstack/react-router"
import { ArrowUpRight, Menu, X } from "lucide-react"
import { Dialog, DialogTrigger, Modal, ModalOverlay } from "react-aria-components"
import { useTranslations } from "use-intl/react"

import { useNavigationLabel } from "~/src/hooks/use-navigation-label"
import { signedInDestination, useVisitorWorkspace } from "~/src/hooks/use-visitor-workspace"

import { CTA_CLASSES } from "~/src/data/cta"
import { HEADER_NAVIGATION } from "~/src/data/navigation"
import { MARKETING_SECTION_IDS } from "~/src/data/navigation.constants"

import { cn } from "~/src/lib/cn"

import { Button } from "~/src/presentation/components/shadcn/button"

import { HomeLink } from "~/src/presentation/components/custom/home-link"

import * as ROUTES from "~/src/routes"

export const MobileMenu = (): JSX.Element => {
  const [isOpen, setIsOpen] = useState(false)

  const t = useTranslations("components.custom.navigation")
  const navigationLabel = useNavigationLabel()
  const workspace = useVisitorWorkspace()
  const startBuilding = useLinkProps({
    hash: MARKETING_SECTION_IDS.PRICING,
    onClick: () => {
      setIsOpen(false)
    },
    to: ROUTES.HOME,
  })

  const close = (): void => {
    setIsOpen(false)
  }

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setIsOpen}>
      <Button aria-label={t("openMenu")} className="size-11 lg:hidden" size="icon-lg" variant="ghost">
        <Menu aria-hidden className="size-4.5" strokeWidth={1.5} />
      </Button>
      <ModalOverlay className="fixed inset-0 z-50">
        <Modal className="h-full">
          <Dialog aria-label={t("menu")} className="flex h-full flex-col outline-none">
            <div className="border-b border-border bg-background">
              <div className="mx-auto flex h-header w-full max-w-site items-center justify-between gap-6 px-6 md:px-10">
                <HomeLink onClick={close} />
                <Button aria-label={t("closeMenu")} autoFocus className="size-11" size="icon-lg" slot="close" variant="ghost">
                  <X aria-hidden className="size-4.5" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-background transition-[opacity,transform] duration-300 ease-exp motion-reduce:transition-none starting:-translate-y-2 starting:opacity-0">
              <div className="mx-auto w-full max-w-site px-6 pb-10 md:px-10">
                <nav aria-label={t("ariaLabel")}>
                  <ul className="divide-y divide-border">
                    {HEADER_NAVIGATION.map((entry) => {
                      const { key, to } = signedInDestination(entry, workspace)

                      return (
                        <li key={entry.key}>
                          <Link
                            {...(entry.hash === undefined ? {} : { activeOptions: { includeHash: true }, hash: entry.hash })}
                            className="group flex items-center justify-between gap-6 py-4 text-lead font-medium tracking-tight text-foreground transition-colors duration-200 ease-exp hover:text-muted-foreground"
                            onClick={close}
                            to={to}
                          >
                            {navigationLabel({ area: entry.area, key, placement: entry.placement })}
                            <ArrowUpRight
                              aria-hidden
                              className="size-4 shrink-0 text-muted-foreground transition-transform duration-200 ease-exp group-hover:translate-x-px group-hover:-translate-y-px"
                              strokeWidth={1.5}
                            />
                          </Link>
                        </li>
                      )
                    })}
                  </ul>
                </nav>
                <a {...startBuilding} aria-current={undefined} className={cn("mt-6 w-full", CTA_CLASSES.PRIMARY)}>
                  {t("getStarted")}
                </a>
              </div>
            </div>
          </Dialog>
        </Modal>
      </ModalOverlay>
    </DialogTrigger>
  )
}
