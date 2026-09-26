import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { LANDING_PAGE_SECTION_ACTIONS } from "~/src/data/admin-landing-page"

import { cn } from "~/src/lib/cn"

import { Button } from "~/src/presentation/components/shadcn/button"

const ICON_STROKE_WIDTH = 1.5

export const SectionActions = ({ className }: { readonly className?: string }): JSX.Element => {
  const t = useTranslations("pages.admin.landing-page.canvas.sectionActions")

  return (
    <div className={cn("absolute top-3 right-3 z-10 flex divide-x divide-border border border-border", className)}>
      {LANDING_PAGE_SECTION_ACTIONS.map(({ className: actionClassName, icon: Icon, id }) => (
        <Button
          aria-label={t(id)}
          className={cn("size-9 rounded-none bg-background text-muted-foreground", actionClassName)}
          key={id}
          size="icon"
          variant="ghost"
        >
          <Icon aria-hidden className="size-4" strokeWidth={ICON_STROKE_WIDTH} />
        </Button>
      ))}
    </div>
  )
}
