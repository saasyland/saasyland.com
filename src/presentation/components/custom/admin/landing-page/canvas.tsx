import type { JSX } from "react"

import { Plus } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { LANDING_PAGE_FEATURES, LANDING_PAGE_VIEWPORTS } from "~/src/data/admin-landing-page"

import { cn } from "~/src/lib/cn"

import { Button } from "~/src/presentation/components/shadcn/button"
import { ToggleGroup, ToggleGroupItem } from "~/src/presentation/components/shadcn/toggle-group"

import { SectionActions } from "~/src/presentation/components/custom/admin/landing-page/section-actions"
import { backgroundGridPatternClassName } from "~/src/presentation/components/custom/background"

const ICON_STROKE_WIDTH = 1.5

const CANVAS_VIEWPORT_WIDTH = "1200px"

const REVEAL_ON_INTERACTION =
  "opacity-0 transition-opacity duration-200 ease-exp group-focus-within:opacity-100 group-hover:opacity-100 motion-reduce:transition-none"

export const LandingPageCanvas = (): JSX.Element => {
  const t = useTranslations("pages.admin.landing-page")

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-4 border-b border-border px-3">
        <ToggleGroup defaultSelectedKeys={["desktop"]} disallowEmptySelection spacing={0} variant="outline">
          {LANDING_PAGE_VIEWPORTS.map(({ icon: Icon, id }) => (
            <ToggleGroupItem aria-label={t(`canvas.viewport.${id}`)} className="h-9 w-11" id={id} key={id}>
              <Icon aria-hidden className="size-4" strokeWidth={ICON_STROKE_WIDTH} />
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <p className="flex items-center gap-2 font-mono text-spec text-muted-foreground tabular-nums">
          <span aria-hidden className="size-1.5 shrink-0 bg-primary" />
          {CANVAS_VIEWPORT_WIDTH}
        </p>
      </div>

      <div className="relative min-h-0 flex-1 bg-background">
        <div aria-hidden className={cn("pointer-events-none absolute inset-0", backgroundGridPatternClassName)} />
        <div className="custom-scrollbar relative h-full overflow-y-auto p-4 lg:p-8">
          <div className="mx-auto max-w-4xl">
            <section aria-label={t("sidebar.sections.hero")} className="group relative border border-ring bg-card px-6 py-14 sm:px-12">
              <span className="absolute -top-px -left-px bg-foreground px-2 py-1 font-mono text-label text-background uppercase">
                {t("sidebar.sections.hero")}
              </span>
              <SectionActions />

              <div className="mx-auto max-w-2xl text-center">
                <span className="inline-flex items-center border border-border bg-background px-2.5 py-1 text-body-sm font-medium text-muted-foreground">
                  {t("canvas.badge")}
                </span>
                <p className="mt-6 text-4xl leading-tight font-semibold tracking-tight text-balance text-foreground md:text-5xl">
                  {t("canvas.headingLead")} <span className="text-ring">{t("canvas.headingAccent")}</span>
                </p>
                <p className="mt-6 text-lg leading-relaxed text-pretty text-muted-foreground">{t("canvas.description")}</p>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
                  <Button size="lg" className="h-12 px-8">
                    {t("canvas.getStarted")}
                  </Button>
                  <Button size="lg" variant="outline" className="h-12 px-8">
                    {t("canvas.bookDemo")}
                  </Button>
                </div>
              </div>
            </section>

            <div className="relative flex items-center justify-center py-6">
              <span aria-hidden className="absolute inset-x-0 top-1/2 h-px bg-border" />
              <Button className="relative gap-2">
                <Plus aria-hidden className="size-4" strokeWidth={ICON_STROKE_WIDTH} />
                {t("canvas.addSectionHere")}
              </Button>
            </div>

            <section
              aria-label={t("sidebar.sections.features")}
              className="group relative border border-border bg-card px-6 py-14 sm:px-12"
            >
              <span
                className={cn(
                  "absolute -top-px -left-px border border-border bg-background px-2 py-1 font-mono text-label text-muted-foreground uppercase",
                  REVEAL_ON_INTERACTION,
                )}
              >
                {t("sidebar.sections.features")}
              </span>
              <SectionActions className={REVEAL_ON_INTERACTION} />

              <div className="mx-auto max-w-2xl text-center">
                <p className="text-2xl font-semibold tracking-tight text-balance text-foreground">{t("canvas.featuresHeading")}</p>
                <p className="mt-3 text-body-sm text-pretty text-muted-foreground">{t("canvas.featuresSubheading")}</p>
              </div>

              <div className="mt-10 grid grid-cols-1 gap-px border border-border bg-border md:grid-cols-3">
                {LANDING_PAGE_FEATURES.map(({ barWidths, icon: Icon, id }) => (
                  <div className="flex h-36 flex-col bg-card p-5" key={id}>
                    <Icon aria-hidden className="size-4 shrink-0 text-ring" strokeWidth={ICON_STROKE_WIDTH} />
                    <p className="mt-4 text-body-sm font-medium text-foreground">{t(`canvas.${id}`)}</p>
                    <span aria-hidden className={cn("mt-4 block h-1.5 bg-muted", barWidths[0])} />
                    <span aria-hidden className={cn("mt-1.5 block h-1.5 bg-muted", barWidths[1])} />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}
