import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { LANDING_PAGE_ACTIONS } from "~/src/data/admin-landing-page"

import { Button } from "~/src/presentation/components/shadcn/button"

const ICON_STROKE_WIDTH = 1.5

export const LandingPageActions = (): JSX.Element => {
  const t = useTranslations("pages.admin.landing-page.actions")

  return (
    <div className="flex flex-wrap items-center gap-2">
      {LANDING_PAGE_ACTIONS.map(({ icon: Icon, id, variant }) => (
        <Button className="gap-2" key={id} size="lg" variant={variant}>
          <Icon className="size-4" strokeWidth={ICON_STROKE_WIDTH} />
          {t(id)}
        </Button>
      ))}
    </div>
  )
}
