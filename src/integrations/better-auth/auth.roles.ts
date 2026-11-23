import type { Statements } from "better-auth/plugins/access"

export const ROLE_CODES = {
  ADMIN: "admin",
  CUSTOMER: "customer",
} as const

export type Role = (typeof ROLE_CODES)[keyof typeof ROLE_CODES]

export interface AreaAccess {
  readonly grants: Readonly<Partial<Record<Role, Statements>>>
  readonly statements: Statements
}

export const ROLE_VALUES = [ROLE_CODES.ADMIN, ROLE_CODES.CUSTOMER] as const satisfies readonly Role[]

export const DEFAULT_ROLE_CODE = ROLE_CODES.CUSTOMER

const ROLE_SET = new Set<string>(ROLE_VALUES)

export const isRole = (value: string | null | undefined): value is Role => typeof value === "string" && ROLE_SET.has(value)
