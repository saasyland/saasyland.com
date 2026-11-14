import { CreditCard, Tag, TrendingDown, Users, Wallet } from "lucide-react"

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
    statusTextColor: "text-amber-800 dark:text-amber-400",
  },
  {
    amount: 199,
    date: "2024-11-18T00:00:00.000Z",
    email: "emma@design.co",
    id: "p4",
    initials: "ED",
    name: "Emma Davis",
    statusColor: "bg-rose-500",
    statusTextColor: "text-rose-700 dark:text-rose-400",
  },
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
