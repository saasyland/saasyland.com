import type { JSX } from "react"

import { Calendar, TrendingUp } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { ADMIN_BLOG_TRENDING_STATS, DEMO_BLOG_STATS } from "~/src/data/admin-blog"

import { Card, CardContent } from "~/src/presentation/components/shadcn/card"

const GROWTH_FORMAT = { maximumFractionDigits: 1, signDisplay: "always", style: "percent" } as const

export const BlogStats = (): JSX.Element => {
  const t = useTranslations("pages.admin.blog.stats")
  const format = useFormatter()

  const stats = {
    subscribers: {
      growth: format.number(DEMO_BLOG_STATS.subscribersGrowth, GROWTH_FORMAT),
      value: format.number(DEMO_BLOG_STATS.subscribers),
    },
    totalViews: {
      growth: format.number(DEMO_BLOG_STATS.viewsGrowth, GROWTH_FORMAT),
      value: format.number(DEMO_BLOG_STATS.totalViews, { maximumFractionDigits: 1, notation: "compact" }),
    },
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 sm:gap-6">
      {ADMIN_BLOG_TRENDING_STATS.map(({ icon: Icon, key }) => (
        <Card key={key}>
          <CardContent className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">{t(key)}</span>
              <Icon className="size-4 text-muted-foreground" />
            </div>
            <div className="text-headline-support text-foreground tabular-nums">{stats[key].value}</div>
            <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-ring">
              <TrendingUp className="size-3" />
              <span>{stats[key].growth}</span>
            </div>
          </CardContent>
        </Card>
      ))}
      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">{t("publishedPosts")}</span>
            <Calendar className="size-4 text-muted-foreground" />
          </div>
          <div className="text-headline-support text-foreground tabular-nums">{format.number(DEMO_BLOG_STATS.publishedPosts)}</div>
          <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <span>{t("draftsPending", { count: DEMO_BLOG_STATS.draftsPending })}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
