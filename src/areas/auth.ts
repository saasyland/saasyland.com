import type { JSX } from "react"

import { type QueryClient, type UseQueryOptions, useQuery, useSuspenseQuery } from "@tanstack/react-query"
import { type AsyncRouteComponent, lazyRouteComponent } from "@tanstack/react-router"
import { type LucideIcon, MailQuestion, UserRound, UsersRound } from "lucide-react"
import type * as zod from "zod"

import type { Permission } from "~/src/integrations/better-auth/auth.access"
import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type { SearchHit } from "~/src/modules/_core/utils/search"
import { userSignupsQuery } from "~/src/modules/user/use-cases/get-user-signups"
import { getUsersQuery } from "~/src/modules/user/use-cases/get-users"
import { searchUsersQuery } from "~/src/modules/user/use-cases/search-users"

import type { BrowserArea } from "~/src/areas/browser"
import { type AdminDashboardEntry, DASHBOARD_PLACEMENT } from "~/src/data/dashboard.constants"

import { SignupsChartPending } from "~/src/presentation/components/custom/admin/dashboard/signups-chart-pending"

import * as ROUTES from "~/src/routes"

export interface AccountDeletionNotice {
  readonly key: string
  readonly load: (context: { readonly queryClient: QueryClient }) => Promise<unknown>
  readonly Notice: AsyncRouteComponent<unknown>
}

export interface AppBadge {
  readonly Badge: AsyncRouteComponent<unknown>
  readonly to: string
}

export interface AppOverviewSection {
  readonly key: string
  readonly load: (context: { readonly locale: SupportedLocale; readonly queryClient: QueryClient }) => Promise<unknown>
  readonly Pending: () => JSX.Element | undefined
  readonly Section: AsyncRouteComponent<unknown>
}

export interface CommandSearchInput {
  readonly locale: SupportedLocale
  readonly text: string
}

export interface CommandSearch {
  readonly icon: LucideIcon
  readonly key: string
  readonly order: number
  readonly permission: Permission
  readonly query: (input: CommandSearchInput) => UseQueryOptions<readonly SearchHit[], Error, readonly SearchHit[], string[]>
}

export interface SignUpIntro {
  readonly appliesTo: (redirect: string | undefined) => boolean
  readonly Intro: AsyncRouteComponent<Readonly<{ redirect: string | undefined }>>
  readonly key: string
  readonly Pending: () => JSX.Element
}

export interface SignUpNotice {
  readonly key: string
  readonly Notice: AsyncRouteComponent<unknown>
  readonly Pending: () => JSX.Element
}

export interface UserProfileSection {
  readonly key: string
  readonly load: (context: { readonly queryClient: QueryClient; readonly userId: string }) => Promise<unknown>
  readonly Pending: () => JSX.Element
  readonly Section: AsyncRouteComponent<{ readonly userId: string }>
}

export interface UserTab {
  readonly key: string
  readonly order: number
  readonly to: string
}

declare module "~/src/areas/browser" {
  interface BrowserArea {
    readonly accountDeletion?: readonly AccountDeletionNotice[]
    readonly appBadges?: readonly AppBadge[]
    readonly appOverview?: readonly AppOverviewSection[]
    readonly appOverviewSearch?: zod.ZodRawShape
    readonly commandSearches?: readonly CommandSearch[]
    readonly dashboard?: readonly AdminDashboardEntry[]
    readonly signUpIntros?: readonly SignUpIntro[]
    readonly signUpNotices?: readonly SignUpNotice[]
    readonly userProfile?: readonly UserProfileSection[]
    readonly userTabs?: readonly UserTab[]
  }
}

export const AUTH_BROWSER = {
  appOverviewSearch: {},
  commandSearches: [
    { icon: UserRound, key: "users", order: 10, permission: { user: ["list"] }, query: ({ text }) => searchUsersQuery({ text }) },
  ],
  dashboard: [
    {
      icon: UsersRound,
      key: "registeredUsers",
      order: 10,
      placement: DASHBOARD_PLACEMENT.STAT,
      prefetch: (queryClient) => queryClient.query({ ...getUsersQuery, staleTime: "static" }),
      to: ROUTES.ADMIN_USERS_ALL,
      useValue: () => useSuspenseQuery(getUsersQuery).data.total,
    },
    {
      icon: MailQuestion,
      key: "pendingVerification",
      order: 30,
      placement: DASHBOARD_PLACEMENT.STAT,
      prefetch: (queryClient) => queryClient.query({ ...getUsersQuery, staleTime: "static" }),
      to: ROUTES.ADMIN_USERS_ALL,
      useValue: () => useSuspenseQuery(getUsersQuery).data.pendingVerification,
    },
    {
      Panel: lazyRouteComponent(() => import("~/src/presentation/components/custom/admin/dashboard/signups-chart"), "SignupsChart"),
      Pending: SignupsChartPending,
      key: "signups",
      order: 20,
      placement: DASHBOARD_PLACEMENT.PANEL,
      prefetch: (queryClient) => queryClient.query({ ...userSignupsQuery(), staleTime: "static" }),
    },
  ],
  name: "auth",
  useTimeZone: () => useQuery({ ...getCurrentSessionQuery, enabled: false }).data?.user.timezone ?? I18N.DEFAULT_TIMEZONE,
  userTabs: [
    { key: "allUsers", order: 10, to: ROUTES.ADMIN_USERS_ALL },
    { key: "invitations", order: 30, to: ROUTES.ADMIN_USERS_INVITATIONS },
  ],
} as const satisfies BrowserArea
