import type { JSX } from "react"

import { Archive, Calendar, CheckCircle2, MoreHorizontal, Pencil, ShoppingBag, Trash2, Users } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { ADMIN_PRICING_MODELS } from "~/src/data/admin"

import { cn } from "~/src/lib/cn"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent } from "~/src/presentation/components/shadcn/card"
import { Switch } from "~/src/presentation/components/shadcn/switch"

const TAG_ICONS = { oneTime: ShoppingBag, subscription: Calendar } as const

export const PricingModelsGrid = (): JSX.Element => {
  const t = useTranslations("pages.admin.pricing-models")

  return (
    <div className="grid grid-cols-1 items-start gap-6 pt-2 md:grid-cols-2 lg:grid-cols-3 lg:gap-8">
      {ADMIN_PRICING_MODELS.map((model) => {
        const TagIcon = TAG_ICONS[model.tag]

        return (
          <Card
            className={cn("group relative flex h-full flex-col gap-0 py-0", {
              "opacity-60 transition-opacity hover:opacity-100": !model.isActive,
              "ring-ring/45": model.isPopular,
            })}
            key={model.id}
          >
            {model.isPopular && (
              <p className="flex items-center gap-2 border-b border-border bg-muted/50 px-5 py-2 font-mono text-label text-foreground uppercase sm:px-6">
                <span aria-hidden className="size-1.25 rounded-xs bg-ring" />
                {t("tags.mostPopular")}
              </p>
            )}
            <CardContent className="flex h-full flex-col p-5 sm:p-6">
              <div className="mb-4 flex items-start justify-between">
                <div>
                  <Badge variant="secondary" className="mb-3 gap-1.5 text-xs font-medium">
                    <TagIcon className="size-3" />
                    {t(`tags.${model.tag}`)}
                  </Badge>
                  <h2 className="text-lg font-medium tracking-tight text-foreground">{t(`models.${model.id}.title`)}</h2>
                </div>
                <Switch aria-label={t("labels.toggleStatus")} className="mt-1" defaultSelected={model.isActive} />
              </div>

              <div className="mb-6">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-price text-foreground tabular-nums">{t(`models.${model.id}.price`)}</span>
                  <span className="font-mono text-spec text-muted-foreground">{t(`models.${model.id}.interval`)}</span>
                </div>
                <p className={cn("mt-2 text-body-sm", { "text-muted-foreground": !model.isPopular, "text-ring": model.isPopular })}>
                  {t(`models.${model.id}.description`)}
                </p>
              </div>

              <div className="mb-6 h-px w-full bg-border" />

              <div className="flex-1">
                <p className="mb-4 font-mono text-label text-muted-foreground uppercase">{t("labels.includedAccess")}</p>
                <ul className="space-y-3">
                  {model.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ring" strokeWidth={1.75} />
                      <span className="text-sm text-muted-foreground">{t(`features.${feature}`)}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-8 flex items-center justify-between border-t border-border pt-5">
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  {model.isActive && <Users className="size-4" />}
                  {model.isActive && t("labels.activeUsers", { count: model.activeUsers })}
                  {!model.isActive && <Archive className="size-4" />}
                  {!model.isActive && t("labels.inactive")}
                </div>
                <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button aria-label={t("labels.editModel")} className="size-8 text-muted-foreground" size="icon" variant="ghost">
                    <Pencil className="size-4" />
                  </Button>
                  {model.isActive && (
                    <Button aria-label={t("labels.moreOptions")} className="size-8 text-muted-foreground" size="icon" variant="ghost">
                      <MoreHorizontal className="size-4" />
                    </Button>
                  )}
                  {!model.isActive && (
                    <Button
                      aria-label={t("labels.deleteModel")}
                      className="size-8 text-muted-foreground hover:text-destructive"
                      size="icon"
                      variant="ghost"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
