import type { JSX } from "react"

import { ImageIcon, Wand2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { LANDING_PAGE_ALIGNMENTS, LANDING_PAGE_BUTTONS, LANDING_PAGE_PADDINGS, LANDING_PAGE_SURFACES } from "~/src/data/admin-landing-page"

import { cn } from "~/src/lib/cn"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet, FieldTitle } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Switch } from "~/src/presentation/components/shadcn/switch"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"
import { ToggleGroup, ToggleGroupItem } from "~/src/presentation/components/shadcn/toggle-group"

const ICON_STROKE_WIDTH = 1.5

const DEFAULT_SECTION_PADDING = "120"

const LEGEND_CLASSNAME = "mb-3 font-mono text-label font-normal text-muted-foreground uppercase"

const LABEL_CLASSNAME = "text-xs font-medium text-muted-foreground"

export const LandingPageProperties = (): JSX.Element => {
  const t = useTranslations("pages.admin.landing-page")

  return (
    <aside aria-label={t("properties.title")} className="flex w-full shrink-0 flex-col lg:h-full lg:w-80">
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div className="min-w-0">
          <h2 className="text-body-sm font-medium text-foreground">{t("properties.title")}</h2>
          <p className="mt-1 text-xs text-pretty text-muted-foreground">{t("properties.description")}</p>
        </div>
        <span className="shrink-0 rounded-sm bg-foreground px-2 py-1 font-mono text-label text-background uppercase">
          {t("sidebar.sections.hero")}
        </span>
      </div>

      <form className="custom-scrollbar min-h-0 flex-1 divide-y divide-border overflow-y-auto">
        <FieldSet className="gap-0 px-4 py-5">
          <FieldLegend className={LEGEND_CLASSNAME}>{t("properties.layout")}</FieldLegend>
          <ToggleGroup className="w-full" defaultSelectedKeys={["alignCenter"]} disallowEmptySelection spacing={0} variant="outline">
            {LANDING_PAGE_ALIGNMENTS.map(({ icon: Icon, id }) => (
              <ToggleGroupItem aria-label={t(`properties.${id}`)} className="h-9 flex-1" id={id} key={id}>
                <Icon aria-hidden className="size-4" strokeWidth={ICON_STROKE_WIDTH} />
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </FieldSet>

        <FieldSet className="gap-0 px-4 py-5">
          <FieldLegend className={LEGEND_CLASSNAME}>{t("properties.spacing")}</FieldLegend>
          <div className="grid grid-cols-2 gap-3">
            {LANDING_PAGE_PADDINGS.map(({ icon: Icon, id }) => (
              <Field key={id}>
                <FieldLabel className={cn("items-center gap-1.5", LABEL_CLASSNAME)} htmlFor={`section-${id}`}>
                  <Icon aria-hidden className="size-3.5 shrink-0" strokeWidth={ICON_STROKE_WIDTH} />
                  {t(`properties.${id}`)}
                </FieldLabel>
                <div className="relative">
                  <Input className="pr-9 text-sm tabular-nums" defaultValue={DEFAULT_SECTION_PADDING} id={`section-${id}`} type="number" />
                  <span aria-hidden className="absolute top-1/2 right-3 -translate-y-1/2 font-mono text-spec text-muted-foreground">
                    {t("properties.unit")}
                  </span>
                </div>
              </Field>
            ))}
          </div>
        </FieldSet>

        <FieldSet className="gap-0 px-4 py-5">
          <FieldLegend className={LEGEND_CLASSNAME}>{t("properties.background")}</FieldLegend>
          <div className="flex flex-wrap gap-2">
            <ToggleGroup defaultSelectedKeys={["page"]} disallowEmptySelection>
              {LANDING_PAGE_SURFACES.map(({ className, id }) => (
                <ToggleGroupItem
                  aria-label={t(`properties.backgroundOptions.${id}`)}
                  className={cn("group/swatch size-11 rounded-none border border-border data-selected:border-ring", className)}
                  id={id}
                  key={id}
                >
                  <span aria-hidden className="hidden size-1.5 bg-primary group-data-selected/swatch:block" />
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
            <Button
              aria-label={t("properties.backgroundOptions.image")}
              className="size-11 rounded-none border-dashed text-muted-foreground"
              size="icon"
              variant="outline"
            >
              <ImageIcon aria-hidden className="size-4" strokeWidth={ICON_STROKE_WIDTH} />
            </Button>
          </div>
        </FieldSet>

        <FieldSet className="gap-0 px-4 py-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <FieldLegend className="mb-0 font-mono text-label font-normal text-muted-foreground uppercase">
              {t("properties.content")}
            </FieldLegend>
            <Button className="-my-2 h-8 gap-1.5 px-0 text-xs" variant="ghost">
              <Wand2 aria-hidden className="size-3.5 shrink-0" strokeWidth={ICON_STROKE_WIDTH} />
              {t("properties.generateAI")}
            </Button>
          </div>
          <FieldGroup className="gap-4">
            <Field>
              <FieldLabel className={LABEL_CLASSNAME} htmlFor="section-badge">
                {t("properties.badgeText")}
              </FieldLabel>
              <Input defaultValue={t("canvas.badge")} id="section-badge" />
            </Field>
            <Field>
              <FieldLabel className={LABEL_CLASSNAME} htmlFor="section-heading">
                {t("properties.heading")}
              </FieldLabel>
              <Textarea
                className="custom-scrollbar min-h-20 resize-none"
                defaultValue={`${t("canvas.headingLead")} ${t("canvas.headingAccent")}`}
                id="section-heading"
              />
            </Field>
            <Field>
              <FieldLabel className={LABEL_CLASSNAME} htmlFor="section-subheading">
                {t("properties.subheading")}
              </FieldLabel>
              <Textarea className="custom-scrollbar min-h-28 resize-none" defaultValue={t("canvas.description")} id="section-subheading" />
            </Field>
          </FieldGroup>
        </FieldSet>

        <FieldSet className="gap-0 px-4 py-5">
          <FieldLegend className={LEGEND_CLASSNAME}>{t("properties.buttonActions")}</FieldLegend>
          <FieldGroup className="gap-3">
            {LANDING_PAGE_BUTTONS.map(({ defaultLabelKey, id }) => (
              <div className="space-y-3 border border-border bg-background p-3" key={id}>
                <Field orientation="horizontal">
                  <FieldTitle className="flex-1 text-xs">{t(`properties.${id}`)}</FieldTitle>
                  <Switch aria-label={t("properties.buttonEnabled")} defaultSelected size="sm" />
                </Field>
                <Field>
                  <FieldLabel className={LABEL_CLASSNAME} htmlFor={`${id}-label`}>
                    {t("properties.label")}
                  </FieldLabel>
                  <Input className="h-8 text-xs" defaultValue={t(defaultLabelKey)} id={`${id}-label`} />
                </Field>
              </div>
            ))}
          </FieldGroup>
        </FieldSet>
      </form>
    </aside>
  )
}
