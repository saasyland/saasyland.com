import type { JSX } from "react"

import { type QueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Link } from "@tanstack/react-router"
import { ArrowUpRight, Clapperboard, GraduationCap, type LucideIcon, Mail, MailQuestion, Package, UsersRound } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"
import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import { getVideosQuery } from "~/src/modules/video/use-cases/get-videos"

import { polarProductsQuery } from "~/src/lib/polar-catalogue"

import * as ROUTES from "~/src/routes"

interface DashboardStat {
  readonly icon: LucideIcon
  readonly label: string
  readonly prefetch: (queryClient: QueryClient) => Promise<unknown>
  readonly to: string
  readonly useValue: () => number
}

export const DASHBOARD_STATS: readonly DashboardStat[] = [
  {
    icon: UsersRound,
    label: "dashboard.auth.registeredUsers",
    prefetch: (queryClient) => queryClient.query({ ...getUsersQuery, staleTime: "static" }),
    to: ROUTES.ADMIN_USERS_ALL,
    useValue: () => useSuspenseQuery(getUsersQuery).data.total,
  },
  {
    icon: Package,
    label: "dashboard.products.totalProducts",
    prefetch: (queryClient) => queryClient.query({ ...polarProductsQuery, staleTime: "static" }),
    to: ROUTES.ADMIN_PRODUCTS,
    useValue: () => useSuspenseQuery(polarProductsQuery).data.products.length,
  },
  {
    icon: MailQuestion,
    label: "dashboard.auth.pendingVerification",
    prefetch: (queryClient) => queryClient.query({ ...getUsersQuery, staleTime: "static" }),
    to: ROUTES.ADMIN_USERS_ALL,
    useValue: () => useSuspenseQuery(getUsersQuery).data.pendingVerification,
  },
  {
    icon: GraduationCap,
    label: "dashboard.courses.learners",
    prefetch: (queryClient) => queryClient.query({ ...courseProgressQuery, staleTime: "static" }),
    to: ROUTES.ADMIN_COURSES,
    useValue: () => useSuspenseQuery(courseProgressQuery).data.learners,
  },
  {
    icon: Clapperboard,
    label: "dashboard.courses.videos",
    prefetch: (queryClient) => queryClient.query({ ...getVideosQuery, staleTime: "static" }),
    to: ROUTES.ADMIN_COURSES,
    useValue: () => useSuspenseQuery(getVideosQuery).data.total,
  },
  {
    icon: Mail,
    label: "dashboard.newsletter.subscribers",
    prefetch: (queryClient) => queryClient.query({ ...newsletterSubscribersQuery, staleTime: "static" }),
    to: ROUTES.ADMIN_NEWSLETTER,
    useValue: () => useSuspenseQuery(newsletterSubscribersQuery).data.total,
  },
]

const StatLabel = ({ label, to }: { readonly label: string; readonly to: string }): JSX.Element => (
  <Link
    className="rounded-sm outline-none after:absolute after:inset-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
    to={to}
  >
    {label}
  </Link>
)

const StatTile = ({ stat }: { readonly stat: DashboardStat }): JSX.Element => {
  const t = useTranslations()
  const format = useFormatter()
  const value = stat.useValue()

  return (
    <div className="group/stat relative flex flex-col gap-4 bg-card p-4 transition-colors duration-200 ease-exp has-[a:hover]:bg-muted/40 sm:p-5">
      <dt className="flex items-start justify-between gap-3 text-body-sm text-muted-foreground transition-colors duration-200 ease-exp group-has-[a:hover]/stat:text-foreground">
        <StatLabel label={t(stat.label)} to={stat.to} />
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-md border border-border bg-background text-muted-foreground"
        >
          <stat.icon className="size-4" strokeWidth={1.75} />
        </span>
      </dt>
      <dd className="flex items-end justify-between gap-3">
        <span className="text-headline-support text-foreground tabular-nums">{format.number(value)}</span>
        <ArrowUpRight
          aria-hidden
          className="size-4 text-muted-foreground opacity-0 transition-opacity duration-200 ease-exp group-has-[a:hover]/stat:opacity-100"
          strokeWidth={1.75}
        />
      </dd>
    </div>
  )
}

export const DashboardStats = (): JSX.Element => (
  <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg bg-border ring-1 ring-foreground/10 lg:grid-cols-3">
    {DASHBOARD_STATS.map((stat) => (
      <StatTile key={stat.label} stat={stat} />
    ))}
  </dl>
)
