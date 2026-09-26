import {
  ArrowDownRight,
  ArrowUpRight,
  BarChart,
  BookOpen,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  FileBadge2,
  FileText,
  Home,
  MonitorSmartphone,
  Package,
  Settings,
  Tag,
  Tags,
  TrendingDown,
  UserMinus,
  Users,
  Wallet,
} from "lucide-react"

import type { UserStatus } from "~/src/modules/user/user.utils"

import { ROUTES } from "~/src/routes"

export const ADMIN_SIDEBAR_GROUPS = [
  {
    items: [
      { icon: Home, titleKey: "dashboard", url: ROUTES.ADMIN },
      { icon: BarChart, titleKey: "analytics", url: ROUTES.ADMIN_ANALYTICS },
    ],
    titleKey: "overview",
  },
  {
    items: [
      { icon: Package, titleKey: "products", url: ROUTES.ADMIN_PRODUCTS },
      { icon: Tags, titleKey: "pricingModels", url: ROUTES.ADMIN_PRICING },
    ],
    titleKey: "offerings",
  },
  {
    items: [
      { icon: BookOpen, titleKey: "blog", url: ROUTES.ADMIN_BLOG },
      { icon: MonitorSmartphone, titleKey: "landingPage", url: ROUTES.ADMIN_LANDING_PAGE },
    ],
    titleKey: "content",
  },
  {
    items: [
      { icon: Users, titleKey: "userManagement", url: ROUTES.ADMIN_USERS },
      { icon: CreditCard, titleKey: "payments", url: ROUTES.ADMIN_PAYMENTS },
      { icon: Settings, titleKey: "settings", url: ROUTES.ADMIN_SETTINGS },
    ],
    titleKey: "administration",
  },
] as const

export type AdminSidebarItem = (typeof ADMIN_SIDEBAR_GROUPS)[number]["items"][number]

export type AdminStatusColor = "amber" | "emerald" | "neutral" | "rose"

export const ADMIN_STATUS_BADGE_CLASSES: Record<AdminStatusColor, string> = {
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "border-ring/30 bg-ring/10 text-ring",
  neutral: "border-border bg-muted text-muted-foreground",
  rose: "border-destructive/25 bg-destructive/10 text-destructive",
}

export const ADMIN_STATUS_DOT_CLASSES: Record<AdminStatusColor, string> = {
  amber: "bg-amber-500",
  emerald: "bg-ring",
  neutral: "bg-muted-foreground/60",
  rose: "bg-destructive",
}

export const USER_STATUS_COLORS: Record<UserStatus, AdminStatusColor> = {
  active: "emerald",
  banned: "rose",
  pending: "amber",
}

export const ADMIN_ANALYTICS_REGION_ROWS = [
  { code: "US", flag: "🇺🇸", percentage: 45 },
  { code: "GB", flag: "🇬🇧", percentage: 22 },
  { code: "CA", flag: "🇨🇦", percentage: 15 },
  { code: "DE", flag: "🇩🇪", percentage: 8 },
  { code: "AU", flag: "🇦🇺", percentage: 10 },
] as const

export const ADMIN_ANALYTICS_UPGRADE_ROWS = [
  { colors: "from-blue-600 to-indigo-400", id: "u1", initials: "AS", name: "Alice Smith" },
  { colors: "from-emerald-600 to-teal-400", id: "u2", initials: "MJ", name: "Michael Johnson" },
  { colors: "from-rose-600 to-orange-400", id: "u3", initials: "ER", name: "Emma Richards" },
  { colors: "border border-border/50 bg-secondary text-muted-foreground", id: "u4", initials: "DL", name: "David Lee" },
  { colors: "from-purple-600 to-fuchsia-400", id: "u5", initials: "SK", name: "Sarah Kline" },
] as const

export const ADMIN_INVITATION_ROWS = [
  { email: "alex.chen@example.com", id: "i1", statusColor: "amber" },
  { email: "m.roberts@startup.io", id: "i2", statusColor: "amber" },
  { email: "k.williams@acme.co", id: "i3", statusColor: "rose" },
  { email: "j.miller@example.com", id: "i4", statusColor: "amber" },
  { email: "s.taylor@designco.com", id: "i5", statusColor: "rose" },
] as const

export const ADMIN_PAYMENT_ROWS = [
  {
    amount: 199,
    date: "2024-11-25T00:00:00.000Z",
    email: "alex@example.com",
    id: "p1",
    initials: "AJ",
    name: "Alex Johnson",
    statusColor: "bg-emerald-500",
    statusTextColor: "text-muted-foreground",
  },
  {
    amount: 9.5,
    date: "2024-11-22T00:00:00.000Z",
    email: "sarah.s@domain.com",
    id: "p2",
    initials: "SS",
    name: "Sarah Smith",
    statusColor: "bg-emerald-500",
    statusTextColor: "text-muted-foreground",
  },
  {
    amount: 9,
    date: "2024-11-20T00:00:00.000Z",
    email: "mike.b@startup.io",
    id: "p3",
    initials: "MB",
    name: "Michael Brown",
    statusColor: "bg-amber-500",
    statusTextColor: "text-amber-500 dark:text-amber-400",
  },
  {
    amount: 199,
    date: "2024-11-18T00:00:00.000Z",
    email: "emma@design.co",
    id: "p4",
    initials: "ED",
    name: "Emma Davis",
    statusColor: "bg-rose-500",
    statusTextColor: "text-rose-500 dark:text-rose-400",
  },
] as const

export const ADMIN_ROLE_ROWS = [
  { id: "r1", usersCount: 3 },
  { id: "r2", usersCount: 12 },
  { id: "r3", usersCount: 5 },
  { id: "r4", usersCount: 28 },
  { id: "r5", usersCount: 2 },
] as const

export const ADMIN_DASHBOARD_STATS = ["activeUsers", "totalProducts", "pendingVerification"] as const

export const ADMIN_DASHBOARD_PREVIEW_PAGINATION = { pageIndex: 0, pageSize: 5 } as const

const CHART_TICK_STEP = 10_000
const CHART_TICK_COUNT = 4
const CHART_YEAR = 2026
const MONTHS_IN_YEAR = 12

export const ADMIN_DASHBOARD_CHART_TICKS = Array.from(
  { length: CHART_TICK_COUNT },
  (_, index) => (CHART_TICK_COUNT - index) * CHART_TICK_STEP - CHART_TICK_STEP,
)

export const ADMIN_DASHBOARD_CHART_MONTHS = Array.from({ length: MONTHS_IN_YEAR }, (_, month) => new Date(Date.UTC(CHART_YEAR, month)))

export const ADMIN_DASHBOARD_CHART_FILTERS = ["12m", "30d", "7d"] as const

export const ADMIN_ANALYTICS_TABS = ["overview", "revenue", "audience", "retention", "reports"] as const

export const ADMIN_ANALYTICS_KPIS = [
  { icon: CircleDollarSign, metric: "mrr", trendIcon: ArrowUpRight },
  { icon: Users, metric: "activeUsers", trendIcon: ArrowUpRight },
  { icon: UserMinus, metric: "churn", trendIcon: ArrowDownRight },
  { icon: Tag, metric: "arpu", trendIcon: ArrowUpRight },
] as const

export interface AdminAnalyticsRevenueBar {
  readonly active?: boolean
  readonly amount?: number
  readonly date?: Date
  readonly height1: string
  readonly height2: string
  readonly id: string
}

export const ADMIN_ANALYTICS_REVENUE_BARS: readonly AdminAnalyticsRevenueBar[] = [
  { amount: 2400, date: new Date("2026-05-01T12:00:00Z"), height1: "45%", height2: "15%", id: "1" },
  { height1: "35%", height2: "20%", id: "2" },
  { height1: "60%", height2: "25%", id: "3" },
  { height1: "50%", height2: "30%", id: "4" },
  { height1: "40%", height2: "22%", id: "5" },
  { height1: "70%", height2: "18%", id: "6" },
  { height1: "85%", height2: "15%", id: "7" },
  { height1: "55%", height2: "25%", id: "8" },
  { height1: "45%", height2: "35%", id: "9" },
  { height1: "30%", height2: "20%", id: "10" },
  { height1: "65%", height2: "15%", id: "11" },
  { height1: "75%", height2: "20%", id: "12" },
  { active: true, amount: 4200, height1: "90%", height2: "10%", id: "13" },
  { height1: "80%", height2: "12%", id: "14" },
  { height1: "60%", height2: "25%", id: "15" },
  { height1: "50%", height2: "35%", id: "16" },
  { height1: "70%", height2: "20%", id: "17" },
  { height1: "40%", height2: "15%", id: "18" },
]

const AXIS_MAX = 4000
const AXIS_STEP = 1000
const ZERO_TICK = 1

export const ADMIN_ANALYTICS_Y_AXIS_VALUES = Array.from(
  { length: AXIS_MAX / AXIS_STEP + ZERO_TICK },
  (_unused, index) => AXIS_MAX - index * AXIS_STEP,
)

export const ADMIN_PRODUCT_TABS = ["all", "onetime", "subscriptions", "categories", "collections", "drafts", "courses"] as const

export const ADMIN_COURSE_CURRICULUM_SECTIONS = [
  {
    icon: ChevronDown,
    id: "gettingStartedSection",
    lessons: [
      { icon: FileText, id: "welcomeLesson" },
      { icon: FileBadge2, id: "setupLesson" },
    ],
  },
  { icon: ChevronRight, id: "coreConceptsSection", lessons: [] },
] as const

export const ADMIN_COURSE_STATUS_TOGGLES = [
  { defaultSelected: true, id: "publish" },
  { defaultSelected: false, id: "certificate" },
] as const

export const ADMIN_PRICING_STATS = [
  { icon: Wallet, id: "monthlyRecurring", value: "$12,450" },
  { icon: Users, id: "activeSubscribers", value: "842" },
  { icon: Tag, id: "activeModels", value: "3" },
] as const

export const ADMIN_PRICING_MODELS = [
  {
    activeUsers: 624,
    features: ["allCourses", "discord", "qa"],
    id: "monthly",
    isActive: true,
    isPopular: false,
    tag: "subscription",
  },
  {
    activeUsers: 218,
    features: ["everythingInMonthly", "sourceFiles", "portfolioReview"],
    id: "annual",
    isActive: true,
    isPopular: true,
    tag: "subscription",
  },
  {
    activeUsers: 0,
    features: ["standaloneCourse", "lifetimeUpdates", "guarantee"],
    id: "lifetime",
    isActive: false,
    isPopular: false,
    tag: "oneTime",
  },
] as const

export const ADMIN_PAYMENTS_TABS = ["transactions", "subscriptions", "payouts", "refunds"] as const

export const ADMIN_REFUND_TRENDING_STATS = [
  { icon: CreditCard, id: "refunded" },
  { icon: TrendingDown, id: "refundRate" },
] as const

export const ADMIN_SETTINGS_TABS = ["general", "security", "team", "billing", "integrations", "api"] as const

export const ADMIN_USERS_TABS = [
  { href: ROUTES.ADMIN_USERS_ALL, id: "allUsers" },
  { href: ROUTES.ADMIN_USERS_INVITATIONS, id: "invitations" },
  { href: ROUTES.ADMIN_USERS_ROLES, id: "roles" },
  { href: ROUTES.ADMIN_USERS_SECURITY, id: "security" },
] as const
