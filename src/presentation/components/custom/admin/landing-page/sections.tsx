import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { LANDING_PAGE_SECTIONS } from "~/src/data/admin-landing-page"

const ICON_STROKE_WIDTH = 1.5

export const LandingPageSections = (): JSX.Element => {
  const t = useTranslations("pages.admin.landing-page.sidebar")

  return (
    <div className="flex w-full shrink-0 flex-col lg:h-full lg:w-64">
      <h2 className="shrink-0 border-b border-border px-4 py-4 font-mono text-label text-muted-foreground uppercase">{t("addSection")}</h2>
      <ul className="custom-scrollbar min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        {LANDING_PAGE_SECTIONS.map(({ icon: Icon, id }) => (
          <li key={id}>
            <div className="group flex h-11 cursor-grab items-center gap-3 px-4 transition-[color,background-color] duration-200 ease-exp hover:bg-muted/50 motion-reduce:transition-none">
              <Icon
                aria-hidden
                className="size-4 shrink-0 text-muted-foreground transition-colors duration-200 ease-exp group-hover:text-foreground motion-reduce:transition-none"
                strokeWidth={ICON_STROKE_WIDTH}
              />
              <span className="truncate text-body-sm font-medium text-muted-foreground transition-colors duration-200 ease-exp group-hover:text-foreground motion-reduce:transition-none">
                {t(`sections.${id}`)}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
