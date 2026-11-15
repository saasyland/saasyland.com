import { USER_STATUS } from "~/src/modules/user/user.constants"
import type { UserStatus } from "~/src/modules/user/user.utils"

export type AdminStatusColor = "amber" | "emerald" | "neutral" | "rose"

export const ADMIN_STATUS_BADGE_CLASSES: Record<AdminStatusColor, string> = {
  amber: "border-amber-500/25 bg-amber-500/10 text-amber-800 dark:text-amber-400",
  emerald: "border-ring/30 bg-ring/10 text-cyan-800 dark:text-ring",
  neutral: "border-border bg-muted text-muted-foreground",
  rose: "border-destructive/25 bg-destructive/10 text-red-700 dark:text-red-300",
}

export const ADMIN_STATUS_DOT_CLASSES: Record<AdminStatusColor, string> = {
  amber: "bg-amber-500",
  emerald: "bg-ring",
  neutral: "bg-muted-foreground/60",
  rose: "bg-destructive",
}

export const USER_STATUS_COLORS: Record<UserStatus, AdminStatusColor> = {
  [USER_STATUS.ACTIVE]: "emerald",
  [USER_STATUS.BANNED]: "rose",
  [USER_STATUS.PENDING]: "amber",
}

export const ADMIN_DASHBOARD_PREVIEW_PAGINATION = { pageIndex: 0, pageSize: 5 } as const

export const ADMIN_SETTINGS_TABS = ["general", "security"] as const
