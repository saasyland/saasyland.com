import { CreditCard, Tag, TrendingDown, Users, Wallet } from "lucide-react"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"

const MONTHLY_PASS_PRICE = 29
const ANNUAL_PASS_PRICE = 290
const COURSE_LICENCE_PRICE = 99
const MONTHS_PER_YEAR = 12
const MONTHLY_RECURRING_REVENUE = 12_450

const COUNT_FORMAT = { style: "decimal" } as const satisfies Intl.NumberFormatOptions

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

export const ADMIN_PRICING_MODELS = [
  {
    activeUsers: 624,
    features: ["allCourses", "discord", "qa"],
    id: "monthly",
    isActive: true,
    isPopular: false,
    price: MONTHLY_PASS_PRICE,
    tag: "subscription",
  },
  {
    activeUsers: 218,
    features: ["everythingInMonthly", "sourceFiles", "portfolioReview"],
    id: "annual",
    isActive: true,
    isPopular: true,
    price: ANNUAL_PASS_PRICE,
    tag: "subscription",
  },
  {
    activeUsers: 0,
    features: ["standaloneCourse", "lifetimeUpdates", "guarantee"],
    id: "lifetime",
    isActive: false,
    isPopular: false,
    price: COURSE_LICENCE_PRICE,
    tag: "oneTime",
  },
] as const

export const ADMIN_ANNUAL_PASS_SAVINGS = MONTHLY_PASS_PRICE * MONTHS_PER_YEAR - ANNUAL_PASS_PRICE

const ACTIVE_MODELS = ADMIN_PRICING_MODELS.filter(({ isActive }) => isActive)
const ACTIVE_SUBSCRIBERS = ACTIVE_MODELS.reduce((total, { activeUsers }) => total + activeUsers, 0)

export const ADMIN_PRICING_STATS = [
  { format: CURRENCY_FORMAT, icon: Wallet, id: "monthlyRecurring", value: MONTHLY_RECURRING_REVENUE },
  { format: COUNT_FORMAT, icon: Users, id: "activeSubscribers", value: ACTIVE_SUBSCRIBERS },
  { format: COUNT_FORMAT, icon: Tag, id: "activeModels", value: ACTIVE_MODELS.length },
] as const

export const ADMIN_PAYMENTS_TABS = ["transactions", "subscriptions", "payouts", "refunds"] as const

export const ADMIN_REFUND_TRENDING_STATS = [
  { icon: CreditCard, id: "refunded" },
  { icon: TrendingDown, id: "refundRate" },
] as const
