import { ArrowDownRight, ArrowUpRight, CircleDollarSign, Tag, UserMinus, Users } from "lucide-react"

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

export const ADMIN_ANALYTICS_Y_AXIS_VALUES = Array.from(
  { length: AXIS_MAX / AXIS_STEP + 1 },
  (_unused, index) => AXIS_MAX - index * AXIS_STEP,
)
